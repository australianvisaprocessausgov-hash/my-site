const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = 3000;

const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ files: [] }).write();

const ADMIN_PASSWORD_HASH = bcrypt.hashSync('mysecretpassword', 10);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    const files = db.get('files').value();
    res.render('index', { files: files });
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    }
    res.render('login', { error: 'Invalid password! Please try again.' });
});

app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) return res.redirect('/login');
    const files = db.get('files').value();
    res.render('admin', { files: files });
});

app.post('/upload', (req, res, next) => {
    if (!req.session.isAdmin) return res.status(403).send('Unauthorized');
    next();
}, upload.single('myFile'), (req, res) => {
    if (!req.file) return res.send('No file selected.');

    db.get('files').push({
        id: Date.now(),
        title: req.body.title || req.file.originalname,
        filename: req.file.filename,
        uploadDate: new Date().toLocaleDateString()
    }).write();

    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(process.env.PORT || PORT, () => console.log(`Server running`));