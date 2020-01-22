const express = require('express')
const bcrypt = require('bcryptjs')
const router = express.Router()
const axios = require('axios');
const mlSentiment = require('ml-sentiment')
const sentiment = mlSentiment({ lang: 'en' })
const {checkAuthorization} = require('../checkauth/authorization')



const SALT_ROUNDS = 10


router.get('/', (req, res) => {
    res.render('index')
})

router.get('/logout', (req, res, next) => {
    if (req.session) {
        req.session.destroy((error) => {
            if (error) {
                next(error)
            } else {
                res.redirect('/login')
            }
        })
    }
})

router.get('/login', (req, res) => {
    res.render('login')
})
// Add a post route for the register form
router.get('/register', (req, res) => {
    res.render('register')
})
router.post('/register', (req, res) => {

    let username = req.body.username
    let password = req.body.password


    // Check if the user already exists in the database
    db.oneOrNone('SELECT userid FROM users WHERE username = $1', [username])
        .then((user) => {
            // If user exists, return a message
            if (user) {
                res.render('register', {
                    message: "Username exists"
                })
            } else {
                // insert user into the users table
                bcrypt.hash(password, SALT_ROUNDS, function (error, hash) {
                    if (error == null) {
                        // instead of [username, password] add hashed pw
                        db.none('INSERT INTO users(username,password) VALUES($1,$2)', [username, hash])
                            .then(() => {
                                // res.send('SUCCESS')
                                res.redirect('login')
                            })
                    }
                })
            }
        })

})

// Add a post route to login that connects to our DB
router.post('/login', (req, res) => {
    let username = req.body.username
    let password = req.body.password

    db.oneOrNone('SELECT userid,username,password FROM users WHERE username = $1', [username])
        .then((user) => {
            // check for user's password
            if (user) {
                bcrypt.compare(password, user.password, function (error, result) {
                    // If the result does exist and the pw matches
                    if (result) {

                        // put username and userID in the session
                        if (req.session) {
                            req.session.user = {
                                userId: user.userid,
                                username: user.username
                            }
                        }
                        // Redirect to a new route
                        res.redirect('/topnews')
                    } else {
                        // If pw doesn't match
                        res.render('login', {
                            message: "Invalid username or password!"
                        })
                    }
                })
                // If  username deoes not exist
            } else {
                res.render('login', {
                    message: "Invalid username or password!"
                })
            }
        })

})

router.get('/topnews', async (req, res) => {

    async function findNewsArticles() {
        searchAddress = 'https://newsapi.org/v2/top-headlines?country=us&pageSize=75&apiKey=8346c55c4813473f8f29da212e2e02fe'
        const data = await axios.get(`${searchAddress}`, {
            headers: {
                "Accept": "application/json",
                "pageSize": "75",
                "X-Api-Key": "8346c55c4813473f8f29da212e2e02fe"
            }
        })
            .then((data) => {

                return myValues = data.data.articles

                // db.none('insert into newsarticles(title,body) VALUES($1,$2)', [title, body])
                //     .then(() => {
                //         res.redirect('/users/articles')
                //     })
            })
            .then((myValues) => {
                myValues.forEach(function (item, index, list) {
                    let author = item.author
                    let title = item.title
                    let description = item.description
                    let url = item.url

                    let itemsentiment = sentiment.classify(item.title);
                    if (itemsentiment >= 5) {
                        emoji = "😃";
                    } else if (itemsentiment > 0) {
                        emoji = "🙂";
                    } else if (itemsentiment == 0) {
                        emoji = "😐";
                    } else {
                        emoji = "😕";
                    }
                    let myemoji = emoji
                db.oneOrNone('select * from newsarticles where title=$1', [title])
                .then((res) => {
                    if (!res) {
                        db.none('insert into newsarticles(title, authorname, body, url, sentiment, sentimentemoji) VALUES($1, $2, $3, $4, $5, $6)', [title, author, description, url, itemsentiment, myemoji])
                    }
                })

            })
                return myValues

            })
            .catch((error) => {
                this.showErrors(error.response.data.error)
            })
        return data;
    }
    findNewsArticles();
    let usnewsarticles = await db.any('select url,title,body,sentimentemoji,newsid from newsarticles')
    res.render('topnews', { usnewsarticles: usnewsarticles })
})


module.exports = router