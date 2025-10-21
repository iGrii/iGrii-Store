// db.js
const mysql = require('mysql2');
// Crear pool de conexiones para manejar múltiples requests
const pool = mysql.createPool({
host: 'localhost',
user: 'root', // tu usuario de MySQL
password: '', // tu contraseña de MySQL
database: 'tienda'
});
// Promisify para usar async/await
const promisePool = pool.promise();
module.exports = promisePool;