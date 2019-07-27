#!/usr/lical/bin/nodejs

const NeDB = require("nedb");

let db = {};

db.profiles = new NeDB({ filename: './.data/profiles.nedb', autoload: true });

let avatars =
      `daniel.jpg
      elliot.jpg
      helen.jpg
      jenny.jpg
      matt.jpg
      steve.jpg
      stevie.jpg
      veronika.jpg`
      .split(/\s+/),
    macs = 
      `80:ED:2C:5D:10:4C 
      30:59:B7:E0:49:B1 
      00:11:D9:34:F8:18 
      B8:27:EB:07:E1:62 
      18:B4:30:09:FA:9D 
      B8:27:EB:F5:86:8B 
      88:87:17:49:E8:B8`
      .split(/\s+/);
      
let profiles = macs.map((mac,i) => ({
    mac: mac,
    avatar: avatars[i % avatars.length],
    name: avatars[i % avatars.length].slice(0,-4)
  }));
  
  //profiles.forEach(p => {console.log(p);});
  
  db.profiles.insert(profiles, (err, docs) => {
    if (err) console.log(err);
    else {
      console.log(`inserted ${docs.length} docs`)
      docs.forEach(p => {console.log(p);});    
    }
  });