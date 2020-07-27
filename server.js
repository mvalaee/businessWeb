const express = require('express')
const app = express();
const PORT = 8000;

var server = app.listen(PORT, () => {
    console.log('Server is listening on port ' + PORT)
  });

app.get('/', (req, res) => {
  res.send('Hello World!')
});

