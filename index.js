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

const urlMongo = "mongodb://localhost:27017/"
const nomeBanco = 'sistemaBioenergy'
const collectionName = 'usuarios'
const collectionServico = 'servicos'
const collectionManu = 'manutenções'
const collectionFeedback = 'feedbacks'

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
        const colecaoUsuarios = banco.collection(collectionName)

        const usuarioExistente = await colecaoUsuarios.findOne({usuario: req.body.usuario})
        if(usuarioExistente){
            res.send('Usuário já existe! Tente outro nome de usuário.')
        }else{
            const senhaCriptografada = await bcrypt.hash(req.body.senha, 10)
            await colecaoUsuarios.insertOne({
                usuario: req.body.usuario,
                senha: senhaCriptografada,
                tipo: 'comum'
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
        const colecaoUsuarios = banco.collection(collectionName)

        const usuario = await colecaoUsuarios.findOne({usuario: req.body.usuario})

        if(usuario && await bcrypt.compare(req.body.senha, usuario.senha)){
            req.session.usuario = req.body.usuario;
            req.session.tipo = usuario.tipo;

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

app.get('/api/usuarios', protegerAdmin, async (req, res) => {
  const client = new MongoClient(urlMongo)
  try {
    await client.connect()
    const db = client.db(nomeBanco)
    const collection = db.collection(collectionName)

    const usuarios = await collection.find({}, { projection: { _id: 1, usuario: 1 } }).toArray()
    res.json(usuarios)
  } catch (err) {
    console.error('Erro ao buscar usuários: ', err)
    res.status(500).send('Erro ao buscar usuários')
  } finally {
    client.close()
  }
})

app.get('/crud_usuarios', protegerAdmin, (req,res) =>{
    res.sendFile(__dirname + '/views/admin/html/usuarios.html')
})

app.get('/crud_servicos', protegerAdmin, (req,res) =>{
    res.sendFile(__dirname + '/views/admin/html/serviços.html')
})

app.get('/crud_manutencoes', protegerAdmin, (req,res) =>{
    res.sendFile(__dirname + '/views/admin/html/manutencoes.html')
})

app.get('/crud_usuarios_cadastro', protegerAdmin, (req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/usuarios/cadastrar.html')
})

app.get('/crud_servicos_cadastro', protegerAdmin, (req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/servicos/cadastrar.html')
})

app.get('/crud_manutencoes_cadastro', protegerAdmin, (req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/manutencao/cadastrar.html')
})

app.post('/crud_usuarios_cadastro', protegerAdmin, async (req,res)=>{
   const novoUsuario = req.body
   const client = new MongoClient(urlMongo)

   try {
       await client.connect()
       const db = client.db(nomeBanco)
       const collection = db.collection(collectionName)

       const senhaCriptografada = await bcrypt.hash(novoUsuario.senha, 10)
       const result = await collection.insertOne({
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

app.post('/crud_servicos_cadastro', protegerAdmin, async (req,res)=>{
   const novoServico = req.body
   const client = new MongoClient(urlMongo)

   try {
       await client.connect()
       const db = client.db(nomeBanco)
       const collection = db.collection(collectionServico)

       const result = await collection.insertOne(novoServico)
       console.log(`Serviço cadastrado com sucesso. ID: ${result.insertedId}`)
       res.redirect('/admin')
        
   }catch(err){
    console.error('Erro ao cadastrar o serviço: ', err)
    res.status(500).send('Erro ao cadastrar o serviço. Por favor tente mais tarde ')
   }finally{
    client.close()
   }
})

app.post('/crud_manutencoes_cadastro', protegerAdmin, async (req,res)=>{
   const novaManu = req.body
   const client = new MongoClient(urlMongo)

   try {
       await client.connect()
       const db = client.db(nomeBanco)
       const collection = db.collection(collectionManu)

       const result = await collection.insertOne(novaManu)
       console.log(`Manutenção cadastrada com sucesso. ID: ${result.insertedId}`)
       res.redirect('/admin')
        
   }catch(err){
    console.error('Erro ao cadastrar a manutenção: ', err)
    res.status(500).send('Erro ao cadastrar a manutenção. Por favor tente mais tarde ')
   }finally{
    client.close()
   }
})

app.get('/crud_usuarios_atualizar', protegerAdmin, async(req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/usuarios/atualizar.html')
})

app.get('/crud_servicos_atualizar', protegerAdmin, async(req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/servicos/atualizar.html')
})

app.get('/crud_manutencoes_atualizar', protegerAdmin, async(req,res)=>{
    res.sendFile(__dirname + '/views/admin/html/manutencao/atualizar.html')
})

app.post('/crud_usuarios_atualizar', protegerAdmin, async(req,res)=>{
    const { id, usuario, senha, tipo } = req.body
    const client = new MongoClient(urlMongo)

    try {
        await client.connect()
        const db = client.db(nomeBanco)
        const collection = db.collection(collectionName)
        const senhaCriptografada = await bcrypt.hash(senha, 10)
        const result = await collection.updateOne({ _id: new ObjectId(id)},{
            $set: {usuario, senha: senhaCriptografada, tipo}
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


app.post('/crud_servicos_atualizar', protegerAdmin, async(req,res)=>{
    const { id, usuario, tipo, custoHora, custoTotal, dias, disponivel } = req.body
    const client = new MongoClient(urlMongo)

    try {
        await client.connect()
        const db = client.db(nomeBanco)
        const collection = db.collection(collectionServico)
        const result = await collection.updateOne({ _id: new ObjectId(id)},{
            $set: {usuario,  tipo, custoHora, custoTotal, dias, disponivel}
        })
        if(result.modifiedCount > 0){
            console.log(`Serviço com o ID: ${id} atualizado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Serviço não encontrado')
        }
    }catch(err){
        console.error('Erro ao atualizar o serviço: ', err)
        res.status(500).send('Erro ao atualizar o Serviço. Por favor tente novamente mais tarde.')
    }finally{
        client.close()
    }
})

app.post('/crud_manutencoes_atualizar', protegerAdmin, async(req,res)=>{
    const { id, usuario, tipo, custoHora, custoTotal, dias, disponivel } = req.body
    const client = new MongoClient(urlMongo)

    try {
        await client.connect()
        const db = client.db(nomeBanco)
        const collection = db.collection(collectionManu)
        const result = await collection.updateOne({ _id: new ObjectId(id)},{
            $set: {usuario,  tipo, custoHora, custoTotal, dias, disponivel}
        })
        if(result.modifiedCount > 0){
            console.log(`Manutenção com o ID: ${id} atualizado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Manutenção não encontrada')
        }
    }catch(err){
        console.error('Erro ao atualizar a manutenção: ', err)
        res.status(500).send('Erro ao atualizar a manutenção. Por favor tente novamente mais tarde.')
    }finally{
        client.close()
    }
})
app.get('/usuario/:id', protegerAdmin, async (req,res)=>{
    const { id } = req.params
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionName)

        const usuario = await collection.findOne({_id: new ObjectId(id)})

        if(!usuario){
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

app.get('/servico/:id', protegerAdmin, async (req,res)=>{
    const { id } = req.params
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionServico)

        const serviço = await collection.findOne({_id: new ObjectId(id)})

        if(!serviço){
            return res.status(404).send('Serviço não encontrado')
        }
        res.json(serviço)
    }catch(err){
        console.error('Erro ao buscar o serviço: ', err)
        res.status(500).send('Erro ao buscar o serviço. Por favor tente novamente mais tarde')
    }finally{
        cliente.close()
    }
})
app.get('/manutencao/:id', protegerAdmin, async (req,res)=>{
    const { id } = req.params
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionManu)

        const manu = await collection.findOne({_id: new ObjectId(id)})

        if(!manu){
            return res.status(404).send('Manutenção não encontrado')
        }
        res.json(manu)
    }catch(err){
        console.error('Erro ao buscar a manutenção: ', err)
        res.status(500).send('Erro ao buscar a manutenção. Por favor tente novamente mais tarde')
    }finally{
        cliente.close()
    }
})

app.post('/crud_usuarios_deletar', protegerAdmin, async(req,res)=>{
    const {id} = req.body
    const client = new MongoClient(urlMongo)

    try{
        await client.connect()
        const db = client.db(nomeBanco)
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

app.post('/crud_servicos_deletar', protegerAdmin, async(req,res)=>{
    const {id} = req.body
    const client = new MongoClient(urlMongo)

    try{
        await client.connect()
        const db = client.db(nomeBanco)
        const collection = db.collection(collectionServico)

        const result = await collection.deleteOne({_id: new ObjectId(id)})

        if(result.deletedCount > 0){
            console.log(`Serviço com ID: ${id} deletado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Serviço não encontrado')
        }
    }catch(err){
        console.log('Erro ao deletar o serviço:', err)
        res.status(500).send('Erro ao deletar o serviço. Por favor tente novamente mais tarde')
    }finally{
        client.close()
    }
})

app.post('/crud_manutencoes_deletar', protegerAdmin, async(req,res)=>{
    const {id} = req.body
    const client = new MongoClient(urlMongo)

    try{
        await client.connect()
        const db = client.db(nomeBanco)
        const collection = db.collection(collectionManu)

        const result = await collection.deleteOne({_id: new ObjectId(id)})

        if(result.deletedCount > 0){
            console.log(`Manutenção com ID: ${id} deletado com sucesso`)
            res.redirect('/admin')
        }else{
            res.status(404).send('Manutenção não encontrada')
        }
    }catch(err){
        console.log('Erro ao deletar a manutenção:', err)
        res.status(500).send('Erro ao deletar a manutenção. Por favor tente novamente mais tarde')
    }finally{
        client.close()
    }
})
app.get('/crud_usuarios_usuarios', protegerAdmin, async(req,res)=>{
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionName)

        const usuarios = await collection.find({}, {projection: {_id:1, usuario:1, senha:1, tipo:1 }}).toArray()
        res.json(usuarios)
    }catch(err){
        console.error('Erro ao buscar usuários: ', err)
        res.status(500).send('Erro ao buscar usuários. Por favor tente novamente mais tarde.')
    }finally{
        cliente.close()
    }
})

app.get('/crud_servicos_servicos', protegerAdmin, async(req,res)=>{
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionServico)

        const usuarios = await collection.find({}, {projection: {_id:1, usuario:1, tipo:1, custoHora:1, custoTotal:1, dias:1, disponivel:1 }}).toArray()
        res.json(usuarios)
    }catch(err){
        console.error('Erro ao buscar servicos: ', err)
        res.status(500).send('Erro ao buscar servicos. Por favor tente novamente mais tarde.')
    }finally{
        cliente.close()
    }
})

app.get('/crud_manutencoes_manutencoes', protegerAdmin, async(req,res)=>{
    const cliente = new MongoClient(urlMongo)

    try{
        await cliente.connect()
        const db = cliente.db(nomeBanco)
        const collection = db.collection(collectionManu)

        const usuarios = await collection.find({}, {projection: {_id:1, usuario:1, tipo:1, custoHora:1, custoTotal:1, dias:1, disponivel:1 }}).toArray()
        res.json(usuarios)
    }catch(err){
        console.error('Erro ao buscar manutenções: ', err)
        res.status(500).send('Erro ao buscar manutenções. Por favor tente novamente mais tarde.')
    }finally{
        cliente.close()
    }
})

app.post('/formulario_feedback', async (req,res)=>{
   const novoFeedback = req.body
   const client = new MongoClient(urlMongo)

   try {
       await client.connect()
       const db = client.db(nomeBanco)
       const collection = db.collection(collectionFeedback)

       const result = await collection.insertOne(novoFeedback)
       console.log(`Feedback cadastrado com sucesso. ID: ${result.insertedId}`)
        
   }catch(err){
    console.error('Erro ao cadastrar o feedback: ', err)
    res.status(500).send('Erro ao cadastrar o feedback. Por favor tente mais tarde ')
   }finally{
    client.close()
    res.redirect('/')
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

app.post('/assistente', (req, res) => {
  const { nome, area } = req.body;

  if (!nome || !area) {
    return res.status(400).json({ erro: 'Preencha nome e área corretamente.' });
  }

  let recomendacao = '';
  const areaNum = parseFloat(area);

  if (isNaN(areaNum)) {
    return res.status(400).json({ erro: 'Área deve ser um número válido.' });
  }

  if (areaNum < 500) {
    recomendacao = 'Um sistema compacto de biodigestor é o mais indicado. Se quiser mais informações, faça Login e use o nosso recurso de chatbot!.';
  } else if (areaNum < 2000) {
    recomendacao = 'Um biodigestor de médio porte pode atender bem sua área. Se quiser mais informações, faça Login e use o nosso recurso de chatbot!.';
  } else {
    recomendacao = 'Recomendamos um sistema industrial de grande porte. Se quiser mais informações, faça Login e use o nosso recurso de chatbot!.';
  }

  res.json({
    mensagem: `Olá ${nome}! Para sua área de ${areaNum} m², nossa recomendação é: ${recomendacao}`
  });
});

app.listen(porta, ()=>{
    console.log(`Servidor rodando na porta ${porta}`)
})
