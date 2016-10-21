import {connect} from 'react-redux'
import {setDrawer} from '../actions/drawer'
import {logoutUser} from '../actions/user'
import {AppState, UserState} from '../reducers/StateTypes'
import QuestAppBar, {QuestAppBarStateProps, QuestAppBarDispatchProps} from './QuestAppBar'

const mapStateToProps = (state: AppState, ownProps: any): QuestAppBarStateProps => {
  return {user: state.user};
}

const mapDispatchToProps = (dispatch: Redux.Dispatch<any>, ownProps: any): QuestAppBarDispatchProps => {
  return {
    onDrawerToggle: (user: UserState) => {
      dispatch(setDrawer(user.id, true));
    },
    onUserDialogRequest: (user: UserState) => {
      dispatch(logoutUser());
    },
  };
}

const QuestAppBarContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(QuestAppBar);

export default QuestAppBarContainer;