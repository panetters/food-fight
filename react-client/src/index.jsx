import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import { BrowserRouter, Route, Link } from 'react-router-dom';
import axios from 'axios';

import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import RestaurantList from './components/RestaurantList.jsx';
import CreateRoom from './components/CreateRoom.jsx';
import Room from './components/Room.jsx';
import SearchUsersPanel from './components/SearchInvite/SearchUsersPanel.jsx';
import InviteUser from './components/SearchInvite/InviteUser.jsx';

import 'bulma/css/bulma.css';
import 'animate.css/animate.css';
import './styles/main.scss';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      restaurants: [],

      loggedIn: false,
      loggedInUsername: null,
      loginError: false,

      searchedUsers: []
    };
  }

  componentDidMount() {
    console.log('PAGE RELOADED');
    axios.get('/checklogin')
      .then(res => {
        console.log('THIS IS RES', res);
        if (res.data.user) {
          console.log('Logged in as:', res.data.user.email);
          this.setState({
            loggedIn: true,
            loggedInUsername: res.data.user.email,
            loginError: false,
          });
        }
      });
  }

  searchYelp() {
    $.post('/api/search', { zip: this.state.query }, (data, status) => {
      console.log(`Requested Yelp search for ${this.state.query}:`, status);
      if (data.businesses) {
        this.setState({
          restaurants: data.businesses,
        });
      }
    });
  }

  updateQuery(e) {
    this.setState({
      query: e.target.value,
    });
  }

  searchUsers(query) {
    console.log('SEARCHING FOR', query);
    axios.post('/searchUsers', { query })
      .then(res => {
        console.log('RESULTS', res);
        this.setState({
          searchedUsers: res.data
        });
      });
  }

  //
  // ─── USER AUTH ──────────────────────────────────────────────────────────────────
  //
  subscribe(email, password, zip) {
    console.log(`Subscribe with ${email} and ${password}`);
    axios.post('/subscribe', {
      email,
      password,
      zip
    })
      .then((res) => {
        const email = JSON.parse(res.config.data).email;
        if (res) {
          this.setState({
            loggedIn: true,
            loggedInUsername: email
          })
        }
      })
      .catch(() => {
        this.setState({
          loginError: true
        })
      });
  }

  login(email, password) {
    console.log(`Login with ${email} and ${password}`);
    axios.post('/login', {
      email,
      password
    })
      .then(res => {
        console.log('DATA', res);
        if (res.config.data) {
          console.log('Logged in as:', JSON.parse(res.config.data).email);
          this.setState({
            loggedIn: true,
            loggedInUsername: JSON.parse(res.config.data).email
          });
        }
      })
      .catch(
        (error => {
          console.log(this);
          this.setState({
            loginError: true
          });
        })()
      );
  }

  logout() {
    axios.get('/logout')
      .then(res => {
        console.log('Logging out');
        this.setState({
          loggedIn: false,
          loginError: false
        });
      })
  }
  // ────────────────────────────────────────────────────────────────────────────────


  render() {
    return (
      <div>
        <Navbar
          login={this.login.bind(this)}
          logout={this.logout.bind(this)}
          subscribe={this.subscribe.bind(this)}
          loggedIn={this.state.loggedIn}
          username={this.state.loggedInUsername}
          error={this.state.loginError} />
        <Hero />
        <div id="site-body" className="tile is-ancestor">
          <div className="tile is-parent is-vertical">
            <SearchUsersPanel
              searchUsers={this.searchUsers.bind(this)}
              foundUsers={this.state.searchedUsers} />
            <InviteUser />
          </div>
          <div className="tile is-parent is-vertical is-8">
            <article className="tile is-child notification create-room-container">
              <h2 className="is-secondary title is-3"> Create A Room</h2>
              <BrowserRouter>
                <div className="container">
                  <Route exact path="/" component={CreateRoom} />
                  {/* TO DO: Check if a user has proper authentication and redirect accordingly */}
                  <Route path="/rooms/:roomID" component={Room} />
                </div>
              </BrowserRouter>
            </article>
          </div>
        </div>
      </div >
    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
