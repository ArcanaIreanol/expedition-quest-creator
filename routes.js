const Cors = require('cors');
const express = require('express');
const fs = require('fs');
const Joi = require('joi');
const Mailchimp = require('mailchimp-api-v3');
const passport = require('passport');
const querystring = require('querystring');
const RateLimit = require('express-rate-limit');
const React = require('react');

const Config = require('./config');
const Feedback = require('./models/feedback');
const Mail = require('./mail');
const oauth2 = require('./lib/oauth2');
const Quests = require('./models/quests');

let Stripe = require('stripe');
if (Config.get('ENABLE_PAYMENT') && Config.get('STRIPE_PRIVATE_KEY')) {
  Stripe = Stripe(Config.get('STRIPE_PRIVATE_KEY'));
} else {
  Stripe = null;
  console.warn("** Payments disabled or Stripe config not set up, any payment requests will fail. **");
}

const mailchimp = (process.env.NODE_ENV !== 'dev') ? new Mailchimp(Config.get('MAILCHIMP_KEY')) : null;

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please contact support by emailing Expedition@Fabricate.io';

// Use the oauth middleware to automatically get the user's profile
// information and expose login/logout URLs to templates.
const router = express.Router();
router.use(oauth2.template);

const limitCors = Cors({
  credentials: true,
  // allows expedition domains, localhost and file (for dev + mobile apps)
  origin: /(expedition(game|rpg)\.com$)|(localhost(:[0-9]+)?$)|(^file:\/\/)/i,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
});

const publishLimiter = new RateLimit({
  windowMs: 60*1000, // 1 minute window
  delayAfter: 2, // begin slowing down responses after the second request
  delayMs: 3*1000, // slow down subsequent responses by 3 seconds per request
  max: 5, // start blocking after 5 requests
  message: 'Publishing too frequently. Please wait 1 minute and then try again',
});

// Phasing out as of 3/21/17; delete any time after 4/14/17
// Joi validation: require title, author, email (valid email), feedback, players, difficulty
// userEmail (valid email), platform, shareUserEmail (default false), version (number)
router.post('/feedback', limitCors, (req, res) => {
  const params = JSON.parse(req.body);
  // strip all HTML tags for protection, then replace newlines with br's
  const HTML_REGEX = /<(\w|(\/\w))(.|\n)*?>/igm;
  const title = params.title.replace(HTML_REGEX, '');
  const htmlFeedback = params.feedback.replace(HTML_REGEX, '').replace(/(?:\r\n|\r|\n)/g, '<br/>');
  let shareUserEmail = '';
  if (params.shareUserEmail && params.userEmail) {
    shareUserEmail = `<p>If you'd like to contact them about their feedback, you can reach them at <a href="mailto:${params.userEmail}">${params.userEmail}</a>.</p>`
  }

  const htmlMessage = `<p>${params.author}, some adventurers sent you feedback on <i>${title}</i>. Hooray! Their feedback:</p>
  <p>"${htmlFeedback}"</p>
  <p>They played with ${params.players} adventurers on ${params.difficulty} difficulty on ${params.platform} v${params.version}.</p>
  ${shareUserEmail}
  <p>If you have questions or run into bugs with the Quest Creator, you can reply directly to this email.</p>
  <p>Happy Adventuring!</p>
  <p>Todd & Scott</p>`;

  res.header('Access-Control-Allow-Origin', req.get('origin'));
  Mail.send(params.email, 'Feedback on your Expedition quest: ' + title, htmlMessage, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send(GENERIC_ERROR_MESSAGE);
    } else {
      return res.send(result.response);
    }
  });
});


router.post('/quests', limitCors, (req, res) => {
  try {
    const token = req.params.token;
    if (!res.locals.id) {
      return res.send(JSON.stringify([]));
    }

    const params = req.body;
    Quests.search(res.locals.id, params, (err, quests, nextToken) => {
      if (err) {
        console.log(err);
        return res.status(500).send(GENERIC_ERROR_MESSAGE);
      }
      const result = {error: err, quests: quests, nextToken: nextToken};
      console.log("Found " + quests.length + " quests for user " + res.locals.id);
      res.send(JSON.stringify(result));
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send(GENERIC_ERROR_MESSAGE);
  }
});


router.get('/raw/:quest', limitCors, (req, res) => {
  Quests.getById(req.params.quest, (err, entity) => {
    if (err) {
      return res.status(500).send(GENERIC_ERROR_MESSAGE);
    }
    res.header('Content-Type', 'text/xml');
    res.header('Location', entity.url);
    res.status(301).end();
  });
});


router.post('/publish/:id', publishLimiter, limitCors, (req, res) => {

  if (!res.locals.id) {
    return res.status(500).end("You are not signed in. Please sign in (by refreshing the page) to save your quest.");
  }

  try {
    Quests.publish(res.locals.id, req.params.id, req.query, req.body, (err, id) => {
      if (err) {
        throw new Error(err);
      }
      console.log("Published quest " + id);
      res.end(id);
    });
  } catch(e) {
    console.log(e);
    return res.status(500).send(GENERIC_ERROR_MESSAGE);
  }
});


router.post('/unpublish/:quest', limitCors, (req, res) => {

  if (!res.locals.id) {
    return res.status(500).end('You are not signed in. Please sign in (by refreshing the page) to save your quest.');
  }

  try {
    Quests.unpublish(req.params.quest, (err, id) => {
      if (err) {
        throw new Error(err);
      }
      console.log("Unpublished quest " + id);
      res.end(id.toString());
    });
  } catch(e) {
    console.log(e);
    return res.status(500).send(GENERIC_ERROR_MESSAGE);
  }
});


router.post('/quest/feedback/:type', limitCors, (req, res) => {
  try {
    Feedback.submit(req.params.type, req.body, (err, id) => {
      if (err) {
        throw new Error(err);
      }
      res.end(id);
    });
  } catch (e) {
    console.log(e);
    return res.status(500).send(GENERIC_ERROR_MESSAGE);
  }
});


router.post('/user/subscribe', limitCors, (req, res) => {
  req.body = JSON.parse(req.body);
  Joi.validate(req.body.email, Joi.string().email().invalid(''), (err, email) => {

    if (err) {
      return res.status(400).send('Valid email address required.');
    }

    if (!mailchimp) {
      return res.status(200).send();
    } else {
      mailchimp.post('/lists/' + Config.get('MAILCHIMP_PLAYERS_LIST_ID') + '/members/', {
        email_address: email,
        status: 'pending',
        merge_fields: {
          SOURCE: 'app',
        },
      })
      .then((result) => {
        console.log(email + ' subscribed as pending to player list');
        return res.status(200).send();
      })
      .catch((err) => {
        console.log('Mailchimp error', err);
        return res.status(err.status).send(err.title);
      });
    }
  });
});


router.post('/stripe/checkout', limitCors, (req, res) => {
  if (!Config.get('ENABLE_PAYMENT')) {
    return res.status(500).send();
  }

  const body = JSON.parse(req.body);

  Joi.validate(body, {
    amount: Joi.number().min(0.5),
  }, {allowUnknown: true}, (err, body) => {

console.log(err, body);
    if (err) {
      return res.status(400).send(err.details.message);
    }
    const charge = Stripe.charges.create({
      amount: body.amount * 100, // charges in smallest whole units, so must convert dollars to pennies
      currency: 'usd',
      description: `Category: ${body.productcategory} - ID: ${body.productid}`,
      metadata: {
        productcategory: body.productcategory,
        productid: body.productid,
        userid: body.userid,
        useremail: body.useremail,
      },
      source: body.token,
    }, (err, charge) => {
  console.log(err, charge);
      if (err) {
        console.log(err);
        return res.status(500).send('Error submitting payment.');
      }
      res.send(charge);
    });
  });


  //         token: stripeToken,
  //         amount: checkout.amount,
  //         productcategory: checkout.productcategory,
  //         productid: checkout.productid,
  //         userid: user.id,
  //         useremail: user.email,
  // braintree.transaction.sale({
  //   amount: req.body.amount.toString(),
  //   // TODO once we have submerchant accounts, and only if this is a quest and its author has a set-up submerchant account
  //   // serviceFeeAmount: (0.3 + 0.23 * req.body.amount).toString(),
  //   paymentMethodNonce: req.body.nonce,
  //   options: {
  //     submitForSettlement: true,
  //     storeInVaultOnSuccess: true,
  //   },
  //   customer: {
  //     email: req.body.useremail,
  //     id: req.body.userid,
  //   },
  //   customFields: {
  //     productcategory: req.body.productcategory,
  //     productid: req.body.productid,
  //   }
  // }, (err, result) => {
  //   if (err) {
  //     console.log(err);
  //     return res.status(500).send('Error submitting payment.');
  //   }
  //   res.send(result);
  // });
});


module.exports = router;
