#!/usr/local/bin/nodejs

/*
 *    server.js
 *    Local presence backend
 */

//console.log('\033c')
require('dotenv').config()
const util = require('util');
const fs = require('fs');
const moment = require('moment');

const express = require('express');
const session = require('express-session');
const mustacheExpress = require('mustache-express');
//const handlebars = require('hbs');
const path = require('path');
//var createError = require('http-errors');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var logger = require('morgan');
//var passport = require('passport');
var app = express();

/*
// dont need this with view cache false above, but maybe useful elsehow?

var chokidar = require('chokidar')
var watcher = chokidar.watch('./views')
watcher.on('ready', function() {
  watcher.on('all', function() {
    console.log("Clearing /dist/ module cache from server")
    Object.keys(require.cache).forEach(function(id) {
      if (/[\/\\]views[\/\\]/.test(id)) delete require.cache[id]
    })
  })
})
*/


app.use(express.static('public') );
app.engine('html', mustacheExpress(null,".html"));
app.engine('mustache', mustacheExpress(null, ".html"));
app.set('view engine', 'mustache');
app.set('view engine', 'mustache');
app.set('view engine', 'html');

//// mustachelayout seems flawed and vulnerable = do not use
////var mustacheLayout = require("mustache-layout");
////app.engine("html", mustacheLayout);
////app.set("view options", {layout: true});

app.set('views', __dirname + '/views'); 
app.set('view cache', false); // FOR DEV/TEST ONLY

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const NeDB = require('nedb');
let db = {};
let nedb = db.presence = new NeDB({ filename: './.data/presence.nedb', autoload: true });
let spansdb = db.spans = new NeDB({ filename: './.data/spans.nedb', autoload: true });
let profilesdb = db.profiles = new NeDB({ filename: './.data/profiles.nedb', autoload: true });
//let snapshotsdb = db.snapshots = new NeDB({ filename: './.data/snapshots.nedb', autoload: true });

nedb.loadDatabase(err => {  
    // Start issuing commands after callback...
    // nedb.insert([{name: "Dan Kingsbury", age: 29},
    //              {name: "Julia", color: "green"}]);
  
  /*
  nedb.find({name: {$gt:  "C"}}, (err,docs) => {
    docs.forEach( (doc) => {
     console.log(JSON.stringify(doc));
    });
  });
  */

  console.log("loaded database: presence");      
   
});



app.use(session({
  secret: 'superSecretRandomStrin125689*&$#@(A',
  resave: false,
  saveUninitialized: true
}));

app.get('/dash', (req,res) => {
  res.render('dashboard.html', {
    title: "Noggin", 
    ts: (new Date()).toString()
  });
});

app.get('/', function(req,res) {
  res.send('<h1>Presence ' + (new Date()).toString() + '</h1>');
});

app.get('/routes', (req,res) => {
 res.send(JSON.stringify(app._router.stack,null,2));
});


app.get('/current', (req,res) => {
  var now = new Date(), 
      today = new Date(now.getFullYear(),now.getMonth(),now.getDate(),0,0,0,0);
  console.log(`today is ${today}`);
  
  db.presence.findOne({snapshot: "current"}, (err,snapshot) => {
    // {snapshot: "current", ts: new Date(), entries: [entries] }
    // db.presence.find({ts: {$gte: today}}, (err, entries) => {
    if (err) {console.log(err); res.status(500).send(err);}
    else {
      snapshot = snapshot || {status:'missing', ts:'', entries: []};
      //console.log(snapshot);
      let entries = snapshot['entries'],
        currentMacs = entries.map(x => x.mac),
        currentSet = entries.reduce((a,c,i,s) => {a[c.mac] = c; return a;},{});
      
      db.profiles.find({mac: {$in: currentMacs}}, (err,currentProfiles) => {
        if (err) {console.log(err); res.status(500).send(err);}
        else {
          //console.log(`found ${currentProfiles.length} matching profiles`);
          //console.log(currentProfiles);
          
          currentProfiles.forEach(x => {
            x.activeSpan = currentSet[x.mac].activeSpan;
            x.lastUpdated = moment(x.activeSpan.until).fromNow(); 
            x.joined = moment(x.activeSpan.since).fromNow(); // get oldestSpan.since
            console.log(x);
          });
          
          let metrics = [
            {name: 'Noggin', value: 36, label: 'widgets', minsAgo: 13, color:'success'},
            {name: 'Stealth Dogs', value: 144, label: 'thingies', minsAgo: 6},
            {name: 'Futurama', value: 1.7, label: 'benders', minsAgo: 3000, color:'warning'},            
          ];
          
          res.render('presence.html', {
            'page-title': 'Current',
            header: 'Currently Online',          
            msg: `Read db.presence ${entries.length} docs - ${(new Date()).toString()}`,
            currentProfiles: currentProfiles,
            "currentProfiles?": currentProfiles.length > 0,
            apiKey: `nuh-uh`,
            ts: moment(snapshot.ts).fromNow(), //`${diffMins(new Date(), new Date(snapshot.ts))}`,
            metrics: metrics
          });
        }
      });
    }
  });
});

function diffMinsRaw(a,b) {
  return Math.round( (a-b) / 60000 );
  //return Math.round((((a-b) % 86400000) % 3600000) / 60000); // just minutes 
}

function diffMins(a,b) {
  // moment.js version
  return moment(b).from(a);
}

app.get('/presence', (req,res) => {
// TODO sort by ts
// TODO sort by mac, name
  db.presence.find({mac: {$exists:true}}, (err, entries) => {
    if (err) {console.log(err); res.status(500).send(err);}
    else {
      res.render('presence.html', {
        'page-title': 'Presence Log',
        header: 'Presence',
        msg: `Read NeDB ${entries.length} docs - ${(new Date()).toString()}`,
        entries: entries,
        apiKey: `API_KEY`
      });
    }
  });
});

app.post('/presence', authenticationRequired, (req,res) => {
  //var data = req.body;//.presence ;// || req.body || req.data;
  console.log("POST /presence");
  console.log(`X-Requested-With: ${req.header('X-Requested-With')}`);  
  console.log(`Content-type: ${req.header('Content-type')}`);  
  //console.log(`req.body`); console.log(req.body);
  //console.log(`presence ${req.body.presence}`);

  // TODO - JSON response if header Accepts: application/json
  // DONE - start spans for new macs
  // DONE - update spans for continuing macs
  // TODO - end spans for missing macs
  // TODO - GET spans JSON
  // TODO - GET spans gantt svg html
  
  let entries;
  if (req.body.presence) {
    entries = parsePresence(req.body.presence); 
  } else {
    entries = req.body.map(x => {x.ts = new Date(x.ts); return x;});
  }

  // Process and update individual entries
  // processSpans returns false if we should NOT update db
  if (!processSpans(entries)) { res.status(200).send('proccessed');  return; }
  
  // update Presence entries 
  db.presence.insert(entries, (err,newDoc) => {
    console.log("  inserted ", JSON.stringify(newDoc));
  });
  
  // Update current snapshot/status summary
  db.presence.update({snapshot: "current"}, {
    snapshot: "current", 
    ts: new Date(),
    entries: entries
  }, {upsert: true}, (a, nDocs) => {
    console.log(`  updated snapshot:current with ${nDocs} rows, ${entries.length} entries`);
  });

  // TODO finally, update Nest API if we have current active presence

  if (req.xhr) {
    // 201 created means no data returned
    // 200 ok implies resource is returned in response
    // TODO send raw json or count or 204
    res.status(200).send(JSON.stringify(entries)); 
    // TODO send current snapshot not array of entries
    // TODO prob move this inside db update callback?
  }
  else {
    res.redirect(302,"/current"); // TODO test this behavior in curl/browser post
  }
});

function processSpans(currentEntries) {

  /*
  { mac: s, ts:t, status: s, activeSpan: {since:t, until: t}, spans: [ {since: t, until: t}, ... ] }
  
  consider:
  {"(mac)": {mac:s, status:s, ts:t,
             activeSpan: {since:t, until:t, status:s},
             spans: [h, h, h, h, ...]
  }
  
  consider ind3xing - speeds up $in, $lt, $gte, etc
  
  db.ensureIndex({ fieldName: 'somefield', unique: true, sparse: true }, function (err) { console.warn(err.key, err.errorType, err.message);}
  });
  // should work on nested fieldnames activeSpan.status, spans

db.ensureIndex({ fieldName: 'createdAt', expireAfterSeconds: 3600 }, function (err) {}); // or could set expirationDate field
  
  
  SORT 
  db.find({}).sort({ planet: 1 }).skip(1).limit(2).exec(function (err, docs) {})
  OR planet: -1 for descending
  const ASC = 1, DESC = -1
  
  IDEA
  .projection({fieldName:1, field2:1, ...})
  function fieldMap("f1 f3 f4 f7") {
    return s.split(/\s+/).reduce((a,c,i) => { a[c] = 1; return a;}, {});
  }
  NeDB.CURSOR.PROTOTYPE.FIELDS = function(cursor, s) {return cursor.projection(fieldMap(s)');}
  
  IDEA
  function genResponseJSON(json, state='normal') {
    json.nav = 
    json.time = getReqTime() //inject stuff into responses
    return json;
  */
  
  db.presence.findOne({snapshot: "current"}, (err, previousSnapshot) => {
    if (err) {console.log(err); res.status(500).send(err);}
    else {  
      previousSnapshot = previousSnapshot || {snapshot:'missing', ts:'', entries:[]};
      let currentMacs = currentEntries.map(x => x.mac),
          currentSet = currentEntries.reduce( (acc,cur,i,src) => {
            acc[cur.mac] = cur;
            return acc;
          }, {} ),
          previousEntries = previousSnapshot.entries,
          previousMacs = previousEntries.map(x => x.mac),
          previousSet = previousEntries.reduce( (acc,cur,i,src) => {
            acc[cur.mac] = cur;
            return acc;
          }, {} );
      console.log("PREVIOUS\n", previousMacs.sort());     
        console.log("PREVIOUS keys\n", Object.keys(previousSet).sort());     
      console.log("CURRENT\n", currentMacs.sort());            
        console.log("CURRENT keys\n", Object.keys(currentSet).sort());     
              
      // TODO could we loop once and deconstruct into new,extend,end?
      
    // which current present entries are still here from last time? 
    // in both prevEntries and currentEntries
    // extend their span - update until=ts


      const by = (f) => { return (a,b) => {a[f] >= b[f]}};
      const byMac = by('mac'); // (a,b) => {a.mac >= b.mac};

      // for all current entries, either they are NEW or EXTENDED 
      let cloneEntries = currentEntries.map(entry => {
        let span = entry.activeSpan || {};
        span.until = new Date(entry.ts);
        
        if (previousMacs.indexOf(entry.mac) >= 0) {
          span.since = previousSet[entry.mac].activeSpan.since;
          span.status = 'extended';          
        }
        else {
          span.since = span.until;
          span.status = 'new';
        }
        span.interval = moment(span.until).from(span.since); //diffMins(span.until, span.since);     

        return Object.assign({}, entry, {activeSpan: span}); // send in the clones
      });


      


      let spansToExtend = currentEntries.filter(entry => {
        return previousMacs.indexOf(entry.mac) >= 0;
      })
      .map(x => {
        x.activeSpan = x.activeSpan || previousSet[x.mac].activeSpan;
        x.activeSpan.until = new Date(x.ts);
        x.activeSpan.interval = diffMins(x.activeSpan.until, x.activeSpan.since);        
        x.activeSpan.status = 'extended';
        return x;
      });
      console.log("spansToExtend (BOTH)\n", spansToExtend.sort(byMac));
      console.log('clonesExtended\n', cloneEntries.filter(x => x.activeSpan.status == 'extended'));     
      
      // which current present entries are newly added? 
      // in entries, not in previous
      // create a new span - since:ts, until:ts, active:true
      
      let newSpans = currentEntries.filter(entry => {
        return previousMacs.indexOf(entry.mac) < 0;
      })
     .map(x => {
        x.activeSpan = x.activeSpan || {};
        x.activeSpan.since = x.activeSpan.until = new Date(x.ts);
        x.activeSpan.interval = diffMins(x.activeSpan.until, x.activeSpan.since);
        x.activeSpan.status = 'new';
        return x;
      });
      console.log("newSpans (CURRENT only)\n", newSpans.sort(byMac));        
      console.log('clonesNEW\n', cloneEntries.filter(x => x.activeSpan.status == 'new'));        
        
      // which entries from last time are not seen now? 
      // in prev not current
      // end their span - active:false (or set until = midpoint ts vs previous ts)
      let spansToEnd = previousEntries.filter(entry => {
        return currentMacs.indexOf(entry.mac) < 0;
      })
      .map(x => {
        x.activeSpan = x.activeSpan || {since: 0, until: 0};
        x.activeSpan.until = dateAdd(new Date(x.activeSpan.since), "minute", 60); // 1 hour after
        x.activeSpan.interval = diffMins(x.activeSpan.until, x.activeSpan.since);
        x.activeSpan.status = 'end';        
        x.spans = x.spans || [];
        x.spans.push(x.activeSpan);
        delete x.activeSpan;
        return x;
      });
      console.log("spansToEnd (PREVIOUS only)\n", util.inspect(spansToEnd.sort(byMac), {colors: true, depth: null}));  
      // TODO update end or return them separately for deconstruction 
      //      if we push them into currentEntries they would log new presence
    }
  });
  
  return true; // true if should update db
}

function dateAdd(date, interval, units) {
  var ret = new Date(date); //don't change original date
  var checkRollover = function() { if(ret.getDate() != date.getDate()) ret.setDate(0);};
  switch(interval.toLowerCase()) {
    case 'year'   :  ret.setFullYear(ret.getFullYear() + units); checkRollover();  break;
    case 'quarter':  ret.setMonth(ret.getMonth() + 3*units); checkRollover();  break;
    case 'month'  :  ret.setMonth(ret.getMonth() + units); checkRollover();  break;
    case 'week'   :  ret.setDate(ret.getDate() + 7*units);  break;
    case 'day'    :  ret.setDate(ret.getDate() + units);  break;
    case 'hour'   :  ret.setTime(ret.getTime() + units*3600000);  break;
    case 'minute' :  ret.setTime(ret.getTime() + units*60000);  break;
    case 'second' :  ret.setTime(ret.getTime() + units*1000);  break;
    default       :  ret = undefined;  break;
  }
  return ret;
}

app.get('/post', (req,res) => {
  res.render('post.html', {title: "Post Presence", ts: (new Date()).toString()});
});

app.post('/clear-all', authenticationRequired, (req,res) => {
  nedb.remove({}, { multi: true }, function (err, numRemoved) {
    console.log(`removed ${numRemoved} docs`);
    nedb.find({}, (err,docs) => {
      if (err) {console.log(err); res.status(500).send(err);}
      console.log(`exists ${docs.length} docs`);
    });
  });

  // 202 Accepted but processing not complete
  // 204 OK no content returned  
  res.status(204); 
});


app.get('/destructure', (req,res) => {
  let a,b,c;
  //[a,b,...c] = [1,2,3,4,5,6];
  ({a,b,...c} = {a:1,b:2,c:3,d:4,e:5,f:6}); // parens required...
  let s = `DESTRUCTURE\n(${a})\n(${b})\n(${util.inspect(c)})`;
  console.log(s);
  res.status(200).send(`<pre>${s}</pre>`);
});

app.get('/api-key', (req,res) => {
  res.send(process.env.API_KEY);
});

// TODO make this ajax, display in sidebar, query instead of param, async?
app.get(['/log','/log/:lines'], (req,res) => {
  let maxLineCount = req.params.lines || 100;
  //fs.readFile('/tmp/presence.log', (err, data) => {
  let err, data = fs.readFileSync('/tmp/presence.log', {encoding:'utf8'});
  if (data) {
    if (err) throw err;

    let lines = data.split(/\n/), 
      nLines = lines.length,
      tail = lines.slice( 0 - maxLineCount, -1).join("\n");
    res.send(`
      <html>
      <body style="background-color: #222222;">
      <pre style="color: #eeeeee; font-family:consolas,courier,mono;">
      ${tail}
      </pre>
      </body>
      </html>`
    );
  }
});

var presenceLog = [];
app.get(['/newlog'], (req,res) => {
  let tail = presenceLog.join("");
  res.send(`
    <html>
    <body style="background-color: #222222;">
    <pre style="color: #eeeeee; font-family:consolas,courier,mono;">
    ${tail}
    </pre>
    </body>
    </html>`
  );
  
});

function authenticationRequired(req, res, next) {
  var api_key = req.header('Authorization'),
      validSession = (process.env.API_KEY == api_key),
      result = {};
  
  if (validSession) {
    console.log(`${req.path} authenticationRequired: OK`);
  }
  else{
    console.log(`${req.path} authenticationRequired: INVALID API_KEY '${api_key}'`);
    result = {
      "api_key": api_key,
      "error":   `INVALID_API_KEY "${api_key}"`,
      "headers":  req.headers
    };
    res.status(401)
       .send(JSON.stringify(result));
    return;
  }
  next();
}

// this doesnt work
app.get('/lay/:id', (req,res) => {
  var id = req.params['id'];
  res.render(`layout.html`, {
    title: `layout ${id}`,
    content: mustacheExpress.mustache.render(`page-content${id}.html`, {
      var1: id
    })
  });
});

function parsePresence(presenceRows) {
  /* expect input lines:
     macADDR  status datestamp
   */
  
  //var peers = request.body.presence.split("\n")
  return presenceRows.split("\n")
         .filter( (row) => (row.replace(/^\s*$/,'') != ''))
         .map( (row) => ( row.split(/\s+/)) )
         .map(function(row){return {
           mac:row[0], 
           status:row[1], 
           ts: new Date(row[2])
         };
      });
}
      

const { spawn } = require('child_process');

const tail = spawn('tail', [ '-f', '/tmp/presence.log']);

tail.stdout.on('data', (data) => {
  //console.log(`stdout: ${data}`);
  presenceLog.push(data);
  if (presenceLog.length > 1000) presenceLog = presenceLog.slice(-999, -1);
});

tail.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

tail.on('close', (code) => {
  console.log(`tail process exited with code ${code}`);
});



// listen for requests :)
var listener = app.listen(process.env.PORT || "3000", function () {
  console.log('Your app is listening on port ' + listener.address().port);
});



