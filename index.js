const express = require('express')
const ObjectId  = require('mongodb').ObjectId
const MongoClient = require('mongodb').MongoClient
const session = require('express-session')
const bcrypt = require('bcrypt')
const methodOverride = require('method-override')

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
    const cliente = new MongoClient(urlMongo)
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
    const cliente = new MongoClient(urlMongo)
    try {
        await cliente.connect()
        const banco = cliente.db(nomeBanco)
        const colecaoUsuarios = banco.collection('usuarios')

        const usuario = await colecaoUsuarios.findOne({usuario: req.body.usuario})

        if(usuario && await bcrypt.compare(req.body.senha, usuario.senha)){
            req.session.usuario = req.body.usuario;
            req.session.tipo = usuario.tipo;

            // Redireciona de acordo com o tipo
            if (usuario.tipo === 'admin') {
                res.redirect('/admin')
            } else {
                res.redirect('/bemvindo')
            }
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

        const senhaCriptografada = await bcrypt.hash(novoUsuario.senha, 10)
        await collection.insertOne({
        usuario: novoUsuario.usuario,
        senha: senhaCriptografada,
        tipo: novoUsuario.tipo || 'comum'
        })
        console.log(`Usuário cadastrado com sucesso. ID: ${result.insertedId}`)

        res.redirect('/admin')
        
   }catch(err){
    console.error('Erro ao cadastrar o usuário: ', err)
    res.status(500).send('Erro ao cadastrar o usuário. Por favor tente mais tarde ')
   }finally{
    client.close()
   }
})

app.get('/crud_usuarios_atualizar', protegerAdmin, async(req,res)=>{
    res.sendFile(__dirname + '/views/admin/views/usuarios/atualizar.html')
})

app.post('/crud_usuarios_atualizar', protegerAdmin, async(req,res)=>{
    const { id, usuario, senha } = req.body

    const client = new MongoClient(urlMongo)

    try {
        await client.connect()

        const db = client.db(nomeAdmin)
        const collection = db.collection(collectionName)
        const senhaCriptografada = await bcrypt.hash(senha, 10)
        const result = await collection.updateOne({ _id: new ObjectId(id)},{
            $set: {usuario, senha: senhaCriptografada}
        })
        if(result.modifiedCount > 0){
            console.log(`Usuário com o ID: ${id} atualizado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Usuário não encontrado')
        }
    }catch(err){
        console.error('Erro ao atualizar o usuário: ', err)
        res.status(500).send('Erro ao atualizar o usuário. Por favor tente novamente mais tarde.')
    }finally{
        client.close()
    }
})

app.get('/usuario/:id', protegerAdmin, async (req,res)=>{
    const { id } = req.params

    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeAdmin)
        const collection = db.collection(collectionName)

        const usuario = await collection.findOne({_id: new ObjectId(id)})

        if(!livro){
            return res.status(404).send('Usuário não encontrado')
        }
        res.json(usuario)
    }catch(err){
        console.error('Erro ao buscar o usuário: ', err)
        res.status(500).send('Erro ao buscar o usuário. Por favor tente novamente mais tarde')
    }finally{
        cliente.close()
    }
})

app.post('/crud_usuarios_deletar', protegerAdmin, async(req,res)=>{
    const {id} = req.body

    const client = new MongoClient(url)

    try{
        await client.connect()

        const db = client.db(nomeAdmin)
        const collection = db.collection(collectionName)

        const result = await collection.deleteOne({_id: new ObjectId(id)})

        if(result.deletedCount > 0){
            console.log(`Usuário com ID: ${id} deletado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Usuário não encontrado')
        }
    }catch(err){
        console.log('Erro ao deletar o usuário:', err)
        res.status(500).send('Erro ao deletar o usuário. Por favor tente novamente mais tarde')
    }finally{
        client.close()
    }
})

app.get('/crud_usuarios_usuarios', protegerAdmin, async(req,res)=>{
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeAdmin)
        const collection = db.collection(collectionName)

        const usuarios = await collection.find({}, {projection: {_id:1, usuario:1, senha:1 }}).toArray()
        res.json(usuarios)
    }catch(err){
        console.error('Erro ao buscar usuários: ', err)
        res.status(500).send('Erro ao buscar usuários. Por favor tente novamente mais tarde.')
    }finally{
        cliente.close()
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

