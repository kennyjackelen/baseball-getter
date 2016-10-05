/* jshint node:true,esnext:true */

'use strict';

var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var async = require('async');

const TICK_INTERVAL = 1000;
const MASTER_SCOREBOARD_URL = 'http://gd2.mlb.com/components/game/mlb/year_2016/month_10/day_04/master_scoreboard.xml';

const eTags = {};

getDay();

function getDay() {

  var options = {
    url: MASTER_SCOREBOARD_URL
  };
  var etag = eTags.day;
  if ( etag ) {
    options.headers = { 'If-None-Match' : etag };
  }

  request( options, function (error, response, body) {
    if ( !error && response.statusCode === 200 ) {
      // store the etag
      eTags.day = response.headers.etag;

      let $ = cheerio.load( body );
      let games = $('game');

      async.each( games, 
        function ( game, callback ) {
          let directory = $( game ).attr('game_data_directory');
          if ( directory ) {
            getGame( directory, callback );
          }
        },
        function ( err ) {
          if ( err ) {
            console.log( err );
          }
          putToFile( body, 'master_scoreboard' );
          setTimeout( getDay, TICK_INTERVAL );
        }
      );
    }
    else {
      setTimeout( getDay, TICK_INTERVAL );
    }

  } );
}

function getGame( directory, callback ) {
  var options = {
    url: 'http://gd2.mlb.com' + directory + '/inning/inning_all.xml'
  };
  var etag = eTags[ directory ];
  if ( etag ) {
    options.headers = { 'If-None-Match' : etag };
  }

  request( options, function (error, response, body) {
    if ( !error && response.statusCode === 200 ) {
      // store the etag
      eTags[ directory ] = response.headers.etag;

      putToFile( body, directory.substr( directory.lastIndexOf('/') + 1 ) );
    }
    callback();
  } );

}

function putToFile( content, directory ) {
  var now = new Date();
  var dir = path.join( __dirname, 'data', dateString( now ), directory );
  mkdirp( dir,
    function() {
      fs.writeFileSync( path.join( dir, timeString( now ) + '.xml' ), content );
    }
  );
}

function dateString( d ) {
  return d.getFullYear() + '-' + zeropad( d.getMonth() + 1 ) + '-' + zeropad( d.getDate() );
}

function timeString( d ) {
  return zeropad( d.getHours() ) + ':' + zeropad( d.getMinutes() ) + ':' + zeropad( d.getSeconds() );
}

function zeropad( str ) {
  return ( '00' + str ).slice( -2 );
}
