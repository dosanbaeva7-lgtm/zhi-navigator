const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

// АДМИН КЛЮЧ (смени пароль на свой)
const ADMIN_KEY = "admin123";

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS practices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacherName TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        experience INTEGER,
        tools TEXT,
        purposes TEXT,
        rating INTEGER,
        timeSaving TEXT,
        description TEXT,
        promptExample TEXT,
        advice TEXT,
        sharingReady TEXT,
        contactInfo TEXT,
        deleteToken TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

// ============ ГЛАВНАЯ СТРАНИЦА ============
app.get('/', (req, res) => {
    db.all(`SELECT id, teacherName, subject, grade, tools, purposes, rating, description, createdAt
            FROM practices ORDER BY createdAt DESC`, (err, practices) => {
        if (err) return res.status(500).send('Ошибка БД');
        res.render('index', { practices });
    });
});

// ============ ДОБАВЛЕНИЕ ПРАКТИКИ ============
app.get('/add', (req, res) => {
    res.render('add', { error: null });
});

app.post('/add', (req, res) => {
    const {
        teacherName, subject, grade, experience, tools, purposes, rating,
        timeSaving, description, promptExample, advice, sharingReady, contactInfo
    } = req.body;

    if (!teacherName || !subject || !grade || !description) {
        return res.render('add', { error: 'Заполните обязательные поля' });
    }

    const token = generateToken();

    db.run(`INSERT INTO practices (
        teacherName, subject, grade, experience, tools, purposes, rating,
        timeSaving, description, promptExample, advice, sharingReady, contactInfo, deleteToken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [teacherName, subject, grade, experience || null, tools || '', purposes || '', 
         rating || null, timeSaving || '', description, promptExample || '', 
         advice || '', sharingReady || '', contactInfo || '', token],
        function(err) {
            if (err) {
                console.error(err);
                return res.render('add', { error: 'Ошибка сохранения: ' + err.message });
            }
            res.render('success', { practiceId: this.lastID, token });
        });
});

// ============ ПРОСМОТР ПРАКТИКИ ============
app.get('/practice/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT * FROM practices WHERE id = ?`, [id], (err, practice) => {
        if (err || !practice) return res.status(404).send('Не найдено');
        res.render('practice', { practice });
    });
});

// ============ УДАЛЕНИЕ ПО СЕКРЕТНОЙ ССЫЛКЕ (ДЛЯ УЧИТЕЛЯ) ============
app.get('/delete/:token/:id', (req, res) => {
    const { token, id } = req.params;
    db.get("SELECT * FROM practices WHERE id = ? AND deleteToken = ?", [id, token], (err, practice) => {
        if (err || !practice) return res.status(404).send('Неверная ссылка');
        db.run("DELETE FROM practices WHERE id = ?", [id], (err) => {
            if (err) return res.status(500).send('Ошибка удаления');
            res.send('? Запись удалена. <a href="/">Вернуться на главную</a>');
        });
    });
});

// ============ АДМИН-ПАНЕЛЬ (УДАЛЕНИЕ ЛЮБЫХ ПРАКТИК) ============
app.get('/admin/:key', (req, res) => {
    if (req.params.key !== ADMIN_KEY) {
        return res.status(403).send('? Доступ запрещен. Неверный ключ.');
    }
    
    db.all(`SELECT id, teacherName, subject, grade, rating, createdAt FROM practices ORDER BY id DESC`, (err, practices) => {
        if (err) return res.status(500).send('Ошибка базы данных');
        res.render('admin', { practices, ADMIN_KEY });
    });
});

app.get('/admin/delete/:key/:id', (req, res) => {
    if (req.params.key !== ADMIN_KEY) {
        return res.status(403).send('? Доступ запрещен');
    }
    
    const id = req.params.id;
    db.run("DELETE FROM practices WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send('Ошибка удаления');
        res.redirect('/admin/' + ADMIN_KEY);
    });
});

// ============ О ПРОЕКТЕ ============
app.get('/about', (req, res) => {
    res.render('about');
});

// ============ ЗАПУСК СЕРВЕРА ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`?? Сервер запущен: http://localhost:${PORT}`);
    console.log(`?? Админ-панель: http://localhost:${PORT}/admin/${ADMIN_KEY}`);
    console.log(`?? Доступно в сети: http://<ваш-IP>:${PORT}`);
});