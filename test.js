var oracledb = require('oracledb');
oracledb.outFormat = oracledb.OBJECT

oracledb.getConnection(
{
  user          : "system",
  password      : "oracle",
  connectString : "192.168.1.203/orcl12c"
},
function(err, connection)
{
  if (err) { console.error(err.message); return; }
  console.log('...')

  connection.execute("SELECT * FROM HELP", [], 
    function(err, result, extr)
    {
      if (err) { console.error(err.message); return; }
      console.log(result.rows);
      console.log(result.metaData);
    });
});
