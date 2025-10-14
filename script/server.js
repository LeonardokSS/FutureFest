const express = require('express')
const MongoClient = require('mongodb').MongoClient
const session = require('express-session')
const bcrypt = require('bcrypt')

const app = express()
const porta = 3000

app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(session({
    secret: '1201201201201390123482048204820428402',
    resave: false,
    saveUninitialized: true,
}))

const urlMongo = "mongodb+srv://admin:admin@cluster0.huwt4el.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
const nomeBanco = 'sistemaBioenergy'

app.get('/', (req,res)=>{
    res.sendFile('index.html')
})

app.get('/registro', (req,res)=>{
    res.sendFile(__dirname + '/views/registro.html')
})

app.post('/registro', async (req,res)=>{
    const cliente = new MongoClient(urlMongo, { useUnifiedTopology: true})
    try {
        await cliente.connect()
        const banco = cliente.db(nomeBanco)
        const colecaoUsuarios = banco.collection('usuarios')

        const usuarioExistente = await colecaoUsuarios.findOne({usuario: req.body.usuario})
        if(usuarioExistente){
            res.send('Usuário já existe! Tente outro nome de usuário.')
        }else{
            const senhaCriptografada = await bcrypt.hash(req.body.senha, 10)
            await colecaoUsuarios.insertOne({
                usuario: req.body.usuario,
                senha: senhaCriptografada
            });
            res.redirect('/login')
        }
    }catch(erro){
        res.send('Erro ao registrar o usuário.')
    }finally {
        cliente.close()
    }
})

app.get('/login', (req,res)=>{
    res.sendFile(__dirname + '/views/login.html')
})

app.post('/login', async (req,res)=>{
    const cliente = new MongoClient(urlMongo, {useUnifiedTopology: true})
    try {
        await cliente.connect()
        const banco = cliente.db(nomeBanco)
        const colecaoUsuarios = banco.collection('usuarios')

        const usuario = await colecaoUsuarios.findOne({usuario: req.body.usuario})

        if(usuario && await bcrypt.compare(req.body.senha, usuario.senha)){
            req.session.usuario = req.body.usuario;
            res.redirect('/')
        }else{
            res.redirect('/erro')
        }
    }catch(erro){
        res.send('Erro ao realizar login.')
    }finally{
        cliente.close()
    }
})

function protegerRota(req,res,proximo){
    if(req.session.usuario){
        proximo()
    }else{
        res.redirect('/login')
    }
}

app.listen(porta, ()=>{
    console.log('Servidor rodando em: http://127.0.0.1:3000')
})

