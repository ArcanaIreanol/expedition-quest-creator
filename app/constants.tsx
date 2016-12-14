// Loaded on index.html
declare var VERSION: string;

export const GITHUB_DOCS = 'https://github.com/Fabricate-IO/expedition-quest-ide/blob/master/docs/';
export const DOCS_INDEX_URL = GITHUB_DOCS + 'index.md';
export const DEV_CONTACT_URL = 'http://expeditiongame.com/contact';


export const QUEST_DOCUMENT_HEADER = `This quest was automatically generated by the Expedition Quest Creator at http://quests.expeditionrpg.com.
To make changes: right-click the file in Drive, select "Open With" and choose "Expedition Quest Creator".\n\nEngine v${VERSION}\n\n`;
export const NEW_QUEST_AUTHOR = 'Your Name';
export const NEW_QUEST_EMAIL = 'email@example.com';
export const NEW_QUEST_SUMMARY = 'Quest summary';
export const NEW_QUEST_TITLE = 'Example Quest Title';
export const NEW_QUEST_URL = 'yoursite.com';
export const NEW_QUEST_TEMPLATE = `# ${NEW_QUEST_TITLE}
summary: ${NEW_QUEST_SUMMARY}
author: ${NEW_QUEST_AUTHOR}
email: ${NEW_QUEST_EMAIL}
url: ${NEW_QUEST_URL}
minPlayers: 2
maxPlayers: 4
minTimeMinutes: 20
maxTimeMinutes: 40

_Introduction_

Welcome to the Expedition Quest Editor! This quest serves as an introduction,
showing you how to how to use all of the tools available to you. Along the way,
it'll provide some helpful tips to write engaging and interactive adventures.

Play along in app using the "Play From Start" button on the right.

If you have questions, feedback or found a bug, let us know at contact@fabricate.io

_Quests_

Quests are stored in your Google drive with a ".quest" file extension. To open them, right click on the file in Drive and select "Open With > Expedition Quest Creator". If you visit the quest creator directly, it'll create a brand new quest with this template.

_Continued_

At the beginning of the story, give some background -
who are your adventurers? Where are they? Why are they here?

Use blank lines to separate text into paragraphs.

When you have to have long sections of text,
it's good to break them up into multiple cards, each about a screen's length,
so that one person isn't stuck reading a small novel out loud.

_Decision time_

The exciting thing about quests vs other forms of writing is that you get to
present players with choices that affect their story -
but make sure to give them enough context to make a meaningful decision.

For example, don't just ask them "left or right?" or "kill or spare the king?" -
give them a hint at the consequences. Maybe the left fork smells of death,
or you'd be tried for treason if you refused to kill your target.

Each time there is a choice (indicated with the *), you indent one additional level.

// Side note, this is a comment - handy for making comments that your
// players won't see!

* Sneak in through the rear, but risk getting trapped

  You can present players with some sort of challenge to see if they succeed -
  for example, rolling to sneak or trying to convince a guard they aren't theives.

  If the players need to do something, like roll a die, you can tell them via
  an instruction (indicated with a >), like so:

  > Roll a d20 to see if you sneak past the guards

  * Rolled 10 or higher

    You sneak past!

    Goto statements jump the players to another card with a specified ID.
    Here, we're jumping to the card further down with the ID "innerCastle",
    which you can defined via (#innerCastle) after the roleplaying card title.

    **goto innerCastle**

  * Rolled Below 10

    A guard spotted you... prepare to fight!

    Also, he seems to be a skeleton. That's... unexpected.

    Note that this is the end of the branch, so it falls through
    and continues to the next un-indented card (in this case the combat,
    since the choice below is still part of the "Decision Time" card).

* Fight your way through the front, but risk the king escaping

  You decide to use your heads and bash your way in.

  Note that this is the end of the branch, so it falls through
  and continues to the next un-indented card (in this case, combat).

_Fighting_

You're about to enter combat. Note how you can list enemies with a hyphen (-)

Also note that all combat must have both on win and on lose outcomes! And that losing a fight doesn't always have to mean the end of a quest...

_combat_

- Skeleton Swordsman

* on win

  Victory! You proceed to the inner castle.

* on lose

  With your last breath, you type an end card, and the story is over.

  **end**

_The Inner Castle_ (#innerCastle)

Now things start to get really interesting.

The parenthesis and pound sign creates an ID for this card
that you jump to with **goto ID** statements. You can jump to any card,
whether it's before or after your current card.

As your adventurers make decisions, you might want to keep track of things
to affect the game in the future. We call this the state.

_Inside the State_

{{weaponsDrawn = false}}
{{gold = 10}}
{{noise = 0}}

You can set the state at the top of roleplaying cards like so.

Use double curly brackets whenever you're working with the state.

You can display values to the party inside of text -
for example, you have {{gold}} gold.

* Draw your weapons and prepare for attack

  {{weaponsDrawn = true}}

  You draw your weapons in anticipation of the battle ahead.

* Remain stealthy

  You decide not to draw attention to yourself.

_Going deeper_

You can also check the state before choices, instructions, gotos and events
(i.e. on win, on lose) to decide if they happen or not. For example, the
"turn the corner" choice will only appear if your party decided to draw its
weapons, and the "Next" button below it will only appear if your party did NOT
draw their weapons.

Note that, by default, single buttons that just continue the story
are labeled "Next", but we highly recommend making them more interesting!

You hear a guard approaching...

* {{weaponsDrawn == true}} Attack!

  _combat_

  - Skeleton Mage

  * on win

    _Victory_

    {{noise = noise + 1}}

    You defeat the guard, but you made a lot of noise in the process...

    // Note: see how we hinted at the consequences of their action

  * on lose

    The guards overpower you. You have failed to assassinate the king.

    **end**

* {{weaponsDrawn == false}} Wait for the guard to pass

  You avoid drawing the guard's attention, your weapons still sheathed.

_Continuing on_

The state can also be used to adjust combat - both the enemies you face, and the win and lose conditions. For example,
if your party made too much noise, they might be in for a bit of a surprise.

If you want to get really fancy, you can even use a state variable to declare an enemy. For example...

{{enemy="Zombie Hand"}}

_combat_

- {{enemy}}
- {{noise > 0}} Undead Viking

* {{noise == 0}} on win

  Silent but deadly.

* {{noise > 0}} on win

  {{noise = noise + 1}}

  You can't catch a break! Another noisy fight, soon the whole army will know
  you're here.

* on lose

  You sucumb to death.

  **end**

_Winning_

Congratulations! You now know enough to build amazing adventures.

If you have any questions - or ideas on how we can make quest writing easier
or more awesome, let us know! Contact@Fabricate.IO

Now, there's just one thing left to do...

_combat_

- Lich
- {{noise > 0}} Skeleton Swordsman
- {{noise > 1}} Floating Skull

* on win

  You completed your mission and return home victorious, but must live with the
  death of an innocent undead dictator for the rest of your years.

  **end**

* on lose

  That was no mere King, that was a undead Lich!
  They sent you on a suicide mission!

  * Surrender

    Realizing that your country isn't that great anyway, you surrender and
    offer your services to the undead Lich King.

    Turns out, he's actually a really nice guy. You become his advisors
    to all things assassination, living a life of luxury and respect,
    and retiring at an early age to study the art of quest writing.

    **end**

  * Fight to the death

    Despite your country sending you on a suicide mission, you keep fighting
    for them.

    Alas, it was a suicide mission.

    **end**

**end**`;
