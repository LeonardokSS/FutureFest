const express = require('express')
const ObjectId  = require('mongodb').ObjectId
const MongoClient = require('mongodb').MongoClient
const session = require('express-session')
const bcrypt = require('bcrypt')
const methodOverride = require('method-override')
const { url } = require('inspector')

const app = express()
const porta = 3000

app.use(express.static(__dirname + '/public'))
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(session({
    secret: 'segredo-super-seguro',
    resave: false,
    saveUninitialized: true,
}))
app.use(methodOverride('_method'))

const urlMongo = "mongodb+srv://admin:admin@cluster0.huwt4el.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
const nomeBanco = 'sistemaBioenergy'
const nomeAdmin = 'admin'
const collectionName = 'usuarios'

app.get('/', (req,res)=>{
    res.sendFile(__dirname + '/views/index.html')
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
                senha: senhaCriptografada,
                tipo: 'comum' // ou 'admin' se quiser criar manualmente
                })
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
            req.session.tipo = usuario.tipo
            res.redirect('/bemvindo')
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

function protegerAdmin(req, res, next) {
  if (req.session.usuario && req.session.tipo === 'admin') {
    next();
  } else {
    res.status(403).send('Acesso negado. Área restrita a administradores.');
  }
}

app.get('/bemvindo', protegerRota, (req,res)=>{
    res.sendFile(__dirname + '/views/bemvindo.html')
})

app.get('/admin', protegerAdmin, (req, res) => {
  res.sendFile(__dirname + '/views/admin/index.html');
});

app.get('/crud_usuarios', protegerAdmin, (req,res) =>{
    res.sendFile(__dirname + '/views/admin/views/usuarios.html')
})

app.get('/crud_usuarios_cadastro', protegerAdmin, (req,res)=>{
    res.sendFile(__dirname + '/views/admin/views/usuarios_cadastro.html')
})

app.post('/crud_usuarios_cadastro', protegerAdmin, async (req,res)=>{
   const novoUsuario = req.body

   const client = new MongoClient(urlMongo)

   try {
       await client.connect()

        const db = client.db(nomeAdmin)
        const collection = db.collection(collectionName)

        const result = await collection.insertOne(novoUsuario)
        console.log(`Usuário cadastrado com sucesso. ID: ${result.insertedId}`)

        res.redirect('/admin')
        
   }catch(err){
    console.error('Erro ao cadastrar o usuário: ', err)
    res.status(500).send('Erro ao cadastrar o usuário. Por favor tente mais tarde ')
   }finally{
    client.close()
   }
})

app.get('/erro', (req,res)=>{
    res.sendFile(__dirname + '/views/erro.html')
})

app.get('/sair', (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            return res.send('Erro ao sair!')
        }res.redirect('/login')
    })
})

app.listen(porta, ()=>{
    console.log(`Servidor rodando na porta ${porta}`)
})

