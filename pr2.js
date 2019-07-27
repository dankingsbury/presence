  if (validSession) {
    console.log(`${req.path} authenticationRequired: OK`);
  }
  else{
    console.log(`${req.path} authenticationRequired: INVALID API_KEY '${api_key}'`);
    result.error = "INVALID_API_KEY";
    result.api_key = api_key;
    res.status(401)
       .send(JSON.stringify(result));
    return;
  }
  next();
}

app.get('/presence', function(request, response) {
  var result = [];
  db.all('SELECT * from Presence ORDER BY mac, ts', function(err, rows) {
    rows.forEach((r) => {
      result.push(`${r.mac} ${new Date(r.ts)} ${r.status}`);
      });
    //response.send(JSON.stringify(rows));
    response.send(`<pre>${result.join("\n")}</pre>`);
  });
});

app.post('/presence', authenticationRequired, function(request, response) {
  /* expect input lines:
     macADDR  status datestamp
   */
  
  console.log('POST Presence');
  console.log(JSON.stringify(request.body));
  
  var peers = request.body.presence.split("\n")
  //var peers = request.body.split("\n")
         .filter(function(row){return row.replace(/^\s*$/,'') != ''})
         .map(function(row){return row.split(/\s+/);})
         //.map(function(row){return [row[0], row[1], new Date(row[2])];})
         .map(function(row){return {
           mac:row[0], 
           status:row[1], 
           ts: new Date(row[2])
         };
      })
      
      ,
      sql = 'INSERT INTO Presence (mac, status, ts) VALUES (?, ?, ?)'
                //+ peers.map(function(row){return `(?,?,?)`;}).join(',');
  ;
  
  //db.run('CREATE TABLE Presence (mac TEXT, ts DATETIME, status TEXT)');
  //console.log(request.body.presence);
  console.log(sql);
  //console.log(JSON.stringify(peers,0,2));
  var i = 0;
  
    db.serialize(function() {
      peers.forEach(function(peer){
        console.log(JSON.stringify(peer));
        db.run(sql,[peer.mac, peer.status, peer.ts],function(err){
          if (err) {
            console.log(err);
          } else {
            i++;
          }
        });
      })
      response.send(`{"rows": "${i}"}\n`);
    });
});

app.get('/schema', function(request, response) {
  var schema = [];
  
  db.all('SELECT sql FROM sqlite_master ORDER BY tbl_name, type DESC, name',
       function(err,result) { 
    if (err) console.log(err);
    response.send(`<pre>\n${JSON.stringify(result,0,2)}\n</pre>`);
  });
});
