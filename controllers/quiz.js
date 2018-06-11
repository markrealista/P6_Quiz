const Sequelize = require("sequelize");
const {models} = require("../models");
const op = Sequelize.Op;

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/quizzes');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


// GET + /quizzes/randomplay. 
exports.randomplay = (req, res, next) => {

    req.session.randomPlay = req.session.randomPlay || [];
    const whereOp = {id: {[op.notIn]: req.session.randomPlay}}; // Ids que no están en session.randomPlay

    models.quiz.count({where:whereOp})
    .then(count => {

        let ofset =  Math.floor(count*Math.random());
        return models.quiz.findAll({ // Devuelve un quiz aleatorio que no este en session.randomPlay
            where: whereOp, 
            offset:ofset, 
            limit: 1
        }) 
        .then(quizzes => {
                return quizzes[0];
        });

    })
    .then(quiz =>{ // de quizzes[0]
        if(quiz === undefined){ // Si el quiz no existe o no es valido
            let score = req.session.randomPlay.length; // Preguntas acertadas
            req.session.randomPlay = []; // Vaciamos el array
            res.render('quizzes/random_nomore',{score: score}); // Renderizamos la vista random_nomore pasando el nº de preguntas acertadas
        } else { // Si el quiz es valido seguimos                     
            let score = req.session.randomPlay.length;
            res.render('quizzes/random_play',{quiz: quiz, score: score}); // Renderiza la vista que nos dice el nº de acierto que llevamos
        }
    })
    .catch(error => {
        next(error);
    });
};


//GET + /quizzes/randomcheck/:quizId?answer=respuesta
exports.randomcheck = (req,res,next) => {
    
    const {quiz, query} = req; // Esto equivale a: 
        // const quiz = req.quiz;
        // const query = req. query;
    const answer = query.answer || ""; // Sacamos de la query la respuesta que hemos escrito o vacio si no hemos escrito nada 
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    req.session.randomPlay = req.session.randomPlay || [];

    if (result) { // Si result vale 1 guardamos el id del quiz en el array de preguntas acertadas
        if (req.session.randomPlay.indexOf(req.quiz.id) === -1) {
            req.session.randomPlay.push(req.quiz.id);
            let score = req.session.randomPlay.length;
            res.render('quizzes/random_result', {result,score,answer});
        }
    } else { // si no vaciamos el array y terminamos el juego
        let score = req.session.randomPlay.length;
        req.session.randomPlay = []; 
        res.render('quizzes/random_result', {result,score,answer});
    }
};
