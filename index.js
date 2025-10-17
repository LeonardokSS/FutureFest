const express = require('express')
const ObjectId  = require('mongodb').ObjectId
const MongoClient = require('mongodb').MongoClient
const session = require('express-session')
const bcrypt = require('bcrypt')
const methodOverride = require('method-override')
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express()
const porta = 3000
const genAI = new GoogleGenerativeAI("AIzaSyCZeRFVrzlebbGWkFbhkJkUjYOlj7NYRLw");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const historico = path.join(__dirname, "public", "historicos", "historico.json");


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

app.post("/login", async (req, res) => {
  const cliente = new MongoClient(urlMongo);
  try {
    await cliente.connect();
    const banco = cliente.db(nomeBanco);
    const colecaoUsuarios = banco.collection(collectionName);

    const usuario = await colecaoUsuarios.findOne({ usuario: req.body.usuario });

    if (usuario && await bcrypt.compare(req.body.senha, usuario.senha)) {
      req.session.usuario = req.body.usuario;
      req.session.tipo = usuario.tipo;

      res.send(`
        <script>
          localStorage.setItem("usuario", "${req.body.usuario}");
          window.location.href = "${usuario.tipo === 'admin' ? '/admin' : '/user'}";
        </script>
      `);
    } else {
      res.redirect("/erro");
    }
  } catch (erro) {
    console.error("Erro no login:", erro);
    res.send("Erro ao realizar login.");
  } finally {
    cliente.close();
  }
});

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

app.get('/user', protegerRota, (req,res)=>{
    res.sendFile(__dirname + '/views/user/index.html')
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

app.get('/mudar-usuario', protegerRota, (req,res)=>{
    res.sendFile(__dirname + '/views/user/html/mudarUsuário.html')
})

app.post('/mudar-usuario', protegerRota, async (req, res) => {
  const { novoUsuario } = req.body;
  const usuarioAtual = req.session.usuario;
  const client = new MongoClient(urlMongo);

  try {
    await client.connect();
    const db = client.db(nomeBanco);
    const collection = db.collection(collectionName);

    const result = await collection.updateOne(
      { usuario: usuarioAtual },
      { $set: { usuario: novoUsuario } }
    );

    if (result.modifiedCount > 0) {
      console.log(`Usuário "${usuarioAtual}" atualizado para "${novoUsuario}"`);
      req.session.usuario = novoUsuario;
      res.redirect('/user');
    } else {
      res.status(404).send('Usuário não encontrado ou não modificado.');
    }
  } catch (err) {
    console.error('Erro ao atualizar o usuário:', err);
    res.status(500).send('Erro ao atualizar o usuário. Por favor, tente novamente mais tarde.');
  } finally {
    client.close();
  }
});

app.get('/mudar-senha', protegerRota, (req, res) => {
  res.sendFile(__dirname + '/views/user/html/mudarSenha.html')
});

app.post('/mudar-senha', protegerRota, async (req, res) => {
  const { senhaAtual, novaSenha, confirmarSenha } = req.body;
  const usuarioAtual = req.session.usuario;
  const client = new MongoClient(urlMongo);

  try {
    await client.connect();
    const db = client.db(nomeBanco);
    const collection = db.collection(collectionName);

    const usuario = await collection.findOne({ usuario: usuarioAtual });

    if (!usuario) {
      return res.sendFile(__dirname + '/views/user/html/senha/usuarioNaoEncontrado.html')
    }

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaCorreta) {
      return res.sendFile(__dirname + '/views/user/html/senha/senhaIncorreta.html')
    }

    if (novaSenha !== confirmarSenha) {
      return res.sendFile(__dirname + '/views/user/html/senha/senhaNaoConcide.html')
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);
    const result = await collection.updateOne(
      { usuario: usuarioAtual },
      { $set: { senha: senhaCriptografada } }
    );

    if (result.modifiedCount > 0) {
      req.session.senha = novaSenha;
      return res.sendFile(__dirname + '/views/user/html/senha/senhaAltera.html')
    } else {
      return res.sendFile(__dirname + '/views/user/html/senha/senhaFalha.html')
    }
  } catch (err) {
    console.error('Erro ao atualizar a senha:', err);
    return res.sendFile(__dirname + '/views/user/html/senha/erroInterno.html')
  } finally {
    client.close();
  }
});

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
  const { nome, area, tipo } = req.body;

  if (!nome || !area || !tipo) {
    return res.status(400).json({ erro: 'Preencha nome, área e tipo corretamente.' });
  }

  const areaNum = parseFloat(area);
  if (isNaN(areaNum)) {
    return res.status(400).json({ erro: 'Área deve ser um número válido.' });
  }

  let recomendacao = '';
  const equipamentos = {
    organica: {
      pequeno: 'BioEnergyCube',
      medio: 'BioEnergyEcoDrive',
      grande: 'BioEnergyContainer'
    },
    madeira: {
      pequeno: 'BioEnergyWoodX',
      medio: 'BioEnergyWooderPro'
    }
  };

  let porte = '';
  if (areaNum < 500) porte = 'pequeno';
  else if (areaNum < 2000) porte = 'medio';
  else porte = 'grande';

  const equipamento = equipamentos[tipo][porte];

  recomendacao = `Recomendamos o equipamento <strong>${equipamento}</strong> para sua área de ${areaNum} m² com biomassa do tipo ${tipo === 'organica' ? 'orgânica' : 'madeira'}. Se quiser mais informações, faça Login e use o nosso recurso de chatbot!.`;

  res.json({
    mensagem: `Olá ${nome}! ${recomendacao}`
  });
});

app.get('/dados-usuario', (req, res) => {
  res.json({ usuario: req.session.usuario });
});

const systemPrompt = `
Você é um assistente virtual da BioEnergy, uma empresa especializada em energia limpa a partir de biomassa.
Seu papel é ajudar os visitantes a escolher os melhores produtos e serviços da empresa, além de responder dúvidas sobre biomassa, energia renovável e sustentabilidade.

Siga estas diretrizes:

Fale sempre em português.
Seja educado, direto e claro.
Dê respostas curtas e objetivas, evitando textos longos.
Forneça informações sobre:
- Serviços (consultoria, instalação, manutenção, capacitação e sustentabilidade)
- A empresa e sua missão
- Energia renovável, biomassa e práticas ambientais

Use esse pequeno banco de estatísticas para dar ao cliente boas recomendações:

Estatísticas do BioEnergyCube:
M²: entre 0 e 500
Tipo de biomassa: Cana de açucar, esterco, palha
Capacidade de biomassa: 1.000 litros (≈ 1 m³)
Taxa de processamento: 0,7 L/min
Tempo para processar o tanque cheio: ≈ 1.430 minutos (23 h 50 min)
Energia gerada por litro: ≈ 10 Wh/L
Energia gerada por minuto: 7 Wh/min (0,007 kWh/min)
Energia total por ciclo (1.000 L): 10.000 Wh = 10 kWh
Custo para processar 1 L de biomassa: R$ 0,02 (média entre R$ 0,01 e R$ 0,03)
Custo total por ciclo: R$ 20,00
Custo operacional por kWh: R$ 2,00/kWh
Energia gerada por real gasto: 0,5 kWh/R$ (≈ 500 Wh/R$)
Preço estimado do equipamento: R$ 3.500,00

Estatísticas do BioEnergyEcoDrive:
M²: 501 e 2000
Tipo de biomassa: Cana de açucar, esterco, palha
Capacidade de biomassa: 5.000 litros
Taxa de processamento: 10 L/min
Tempo para processar o tanque cheio: 500 minutos (≈ 8 h 20 min)
Energia gerada por litro: 5,25 Wh/L
Energia gerada por minuto: 52,5 Wh/min (0,0525 kWh/min)
Energia total por ciclo (5.000 L): 26.250 Wh = 26,25 kWh
Custo para processar 1 L de biomassa: R$ 0,05
Custo total por ciclo: R$ 250,00
Custo operacional por kWh: R$ 9,52/kWh
Energia gerada por real gasto: 0,105 kWh/R$ (≈ 105 Wh/R$)
Preço estimado do equipamento: R$ 8.500,00

Estatísticas do BioEnergyContainer:
M²: A partir de 2001 
Tipo de biomassa: Cana de açucar, esterco, palha
Capacidade de biomassa: 8.000 litros
Taxa de processamento: 15 L/min
Tempo para processar tanque cheio: ~533 minutos (≈ 8 h 53 min)
Energia gerada por litro: 5,25 Wh/L
Energia gerada por minuto: 78,75 Wh/min (0,07875 kWh/min)
Energia total por ciclo: 42 kWh
Custo para processar 1 L de biomassa: R$ 0,05
Custo total por ciclo: R$ 400
Custo operacional por kWh: R$ 9,52/kWh
Energia gerada por real gasto: 0,105 kWh/R$ (105 Wh/R$)
Preço estimado do equipamento: R$ 15.000

Estatísticas do BioEnergyWoodX:
M²: 0 a 500
Tipo de biomassa: Madeira, cavacos e aparas
Capacidade de biomassa: 500 litros
Taxa de processamento: 1,5 L/min
Tempo para processar tanque cheio: 500 ÷ 1,5 ≈ 333 minutos (~5 h 33 min)
Energia gerada por litro: 5 ÷ 1,5 ≈ 3,33 Wh/L
Energia gerada por minuto: 5 Wh/min (0,005 kWh/min)
Energia total por ciclo (500 L): 500 × 3,33 ≈ 1.665 Wh ≈ 1,67 kWh
Custo para processar 1 L de biomassa: R$ 0,02
Custo total por ciclo: 500 × 0,02 = R$ 10
Custo operacional por kWh: 10 ÷ 1,67 ≈ R$ 5,99/kWh
Energia gerada por real gasto: 1,67 ÷ 10 ≈ 0,167 kWh/R$ (167 Wh/R$)
Preço estimado do equipamento: R$ 2.500

Estatísticas do BioEnergyWooderPro:
M²: A partir de 500
Tipo de biomassa: Madeira, cavacos e aparas
Capacidade de biomassa: 2.000 litros
Taxa de processamento: 7 L/min
Tempo para processar tanque cheio: 2.000 ÷ 7 ≈ 286 minutos (~4 h 46 min)
Energia gerada por litro: 16 ÷ 7 ≈ 2,29 Wh/L
Energia gerada por minuto: 16 Wh/min (0,016 kWh/min)
Energia total por ciclo (2.000 L): 2.000 × 2,29 ≈ 4.580 Wh ≈ 4,58 kWh
Custo para processar 1 L de biomassa: R$ 0,075
Custo total por ciclo: 2.000 × 0,075 = R$ 150
Custo operacional por kWh: 150 ÷ 4,58 ≈ R$ 32,75/kWh
Energia gerada por real gasto: 4,58 ÷ 150 ≈ 0,0305 kWh/R$ (30,5 Wh/R$)
Preço estimado do equipamento: R$ 6.000

Lembre-se que o tipo de biomassa não se restringe apenas aos citados, mas ao grupo que eles fazem parte. Ao recomendar máquina. Diga sempre assim: o nome, estatísticas de energia gerada por litro e minuto, custo para processar e capacidade. As outras informações você pode dizer caso o usuário pedir. A área em m² não manda na recomendação dos produtos, apenas o tipo de biomassa, por exemplo se o usuário tiver uma área pequena porém usar muita cana é preferível recomendar o EcoDrive ao invés do Cube. 

Responda de forma clara, objetiva e bem organizada. Use frases completas e evite blocos de texto confusos. Para informações técnicas (como estatísticas de equipamentos), apresente os dados em parágrafos curtos, com medidas e valores destacados de forma natural no texto, sem excesso de negrito ou marcadores. Sempre inclua um resumo ou conclusão prática ao final. Se houver números importantes (como capacidade, energia, custo), inclua-os no corpo do texto de forma legível e fluida. Exemplo de estilo desejado:

'O BioEnergyWooderPro é ideal para biomassa de madeira e possui capacidade para 2.000 litros. Ele gera 16 Wh de energia por minuto, o que equivale a 2,29 Wh por litro processado. O custo para processar cada litro de biomassa é de R$ 0,075. Esse equipamento fornece energia suficiente para atender necessidades médias em terrenos de 500 m², aproveitando resíduos de madeira de forma eficiente.'

Para links de navegação dentro do site, use HTML, no formato <a href="rota">Texto do link</a>. Por exemplo:
   - Para o usuário acessar produtos: <a href="/produtos">produtos</a>
   - Para serviços: <a href="/servicos">serviços</a>
   - Para manutenções: <a href="/manutencoes">manutenções</a>

Sempre utilize o histórico da conversa para responder de forma contextualizada, lembrando das mensagens anteriores do usuário. Diga as respostas com base no histórico e é isso.

Seu objetivo é oferecer um atendimento simples, rápido e informativo, ajudando o cliente a entender as soluções da BioEnergy e tomar boas decisões.
`;

app.post("/api/chat", async (req, res) => {
  const { usuario, text } = req.body;

  if (!usuario || !text) {
    return res.status(400).json({ reply: "Usuário e mensagem são obrigatórios." });
  }

  const pastaHistoricos = path.join(__dirname, "public", "historicos");
  if (!fs.existsSync(pastaHistoricos)) {
    fs.mkdirSync(pastaHistoricos, { recursive: true });
  }

  const caminhoHistorico = path.join(pastaHistoricos, `${usuario}.json`);
  if (!fs.existsSync(caminhoHistorico)) {
    fs.writeFileSync(caminhoHistorico, JSON.stringify([]));
  }

  try {
    const historico = JSON.parse(fs.readFileSync(caminhoHistorico, "utf8"));
    historico.push({ role: "user", content: text });

    const conversa = historico
      .map((msg) => `${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`)
      .join("\n");

    const prompt = `${systemPrompt}\n\n${conversa}\nAssistente:`;
    const result = await model.generateContent(prompt);
    const reply = result.response.text().trim();

    historico.push({ role: "assistant", content: reply });
    fs.writeFileSync(caminhoHistorico, JSON.stringify(historico, null, 2));

    res.json({ reply });
  } catch (err) {
    console.error("Erro:", err);
    res.status(500).json({ reply: "Erro ao processar a mensagem." });
  }
});

// Rota para limpar histórico de um usuário
app.post("/api/clear-historico", (req, res) => {
  const { usuario } = req.body;
  const caminho = path.join(__dirname, "public", "historicos", `${usuario}.json`);
  if (fs.existsSync(caminho)) {
    fs.writeFileSync(caminho, JSON.stringify([]));
    res.json({ message: "Histórico apagado com sucesso." });
  } else {
    res.status(404).json({ message: "Usuário não encontrado." });
  }
});

// Rota para dados do usuário (simulada)
app.get("/dados-do-usuario", (req, res) => {
  res.json({ usuario: req.session.usuario  }); // substitua por lógica real se necessário
});

app.listen(porta, ()=>{
    console.log(`Servidor rodando na porta ${porta}`)
})
