import React, { useState, useEffect } from 'react';
import './App.css'; 

const CLIENT_ID = 'COLE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com';

const mesesAbv = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const diasSemanaMin = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState('Extrato'); 
  const [dadosProntos, setDadosProntos] = useState(false);

  // ==========================================
  // CÉREBRO DO APP E ESTADOS LOCAIS
  // ==========================================
  const [contasGlobais, setContasGlobais] = useState([]); 
  const [categoriasGlobais, setCategoriasGlobais] = useState([
    { id: 'cat_ra', nome: 'Renda Ativa', tipo: 'receita', cor: '#e8f5e9', subs: [{id: 's_ra1', nome: 'Salário'}, {id: 's_ra2', nome: 'Extra'}, {id: 's_ra3', nome: 'Vendas'}] },
    { id: 'cat_rp', nome: 'Renda Passiva', tipo: 'receita', cor: '#e8f5e9', subs: [{id: 's_rp1', nome: 'Dividendos'}, {id: 's_rp2', nome: 'FIIs'}, {id: 's_rp3', nome: 'Juros Invest.'}] },
    { id: 'cat_ev', nome: 'Eventuais', tipo: 'receita', cor: '#e8f5e9', subs: [{id: 's_ev1', nome: 'Estornos'}, {id: 's_ev2', nome: 'Cashback'}] },
    { id: 'cat_es', nome: 'Essencial', tipo: 'despesa', cor: '#ffebee', subs: [{id: 's_es1', nome: 'Moradia'}, {id: 's_es2', nome: 'Alimentação'}, {id: 's_es3', nome: 'Transporte'}, {id: 's_es4', nome: 'Educação'}, {id: 's_es5', nome: 'Saúde'}, {id: 's_es6', nome: 'Impostos e Taxas'}] },
    { id: 'cat_nes', nome: 'Não Essencial', tipo: 'despesa', cor: '#fff3e0', subs: [{id: 's_nes1', nome: 'Comida'}, {id: 's_nes2', nome: 'Lazer'}, {id: 's_nes3', nome: 'Compras'}] },
    { id: 'cat_met', nome: 'Metas/Objetivos', tipo: 'despesa', cor: '#e3f2fd', subs: [{id: 's_met1', nome: 'Investimentos'}, {id: 's_met2', nome: 'Reserva Financeira'}, {id: 's_met3', nome: 'Dívidas'}] }
  ]);
  const [transacoes, setTransacoes] = useState([]); 

  useEffect(() => {
    try {
      const transSalvas = localStorage.getItem('@transacoes');
      const contasSalvas = localStorage.getItem('@contas');
      const catsSalvas = localStorage.getItem('@categorias');

      if (transSalvas) {
        const parsed = JSON.parse(transSalvas).map(t => ({ ...t, dataObj: new Date(t.dataObj) }));
        setTransacoes(parsed);
      }
      if (contasSalvas) setContasGlobais(JSON.parse(contasSalvas));
      if (catsSalvas) setCategoriasGlobais(JSON.parse(catsSalvas));
    } catch (e) {
      console.log('Erro ao carregar dados:', e);
    } finally {
      setDadosProntos(true);
    }
  }, []);

  useEffect(() => { if(dadosProntos) localStorage.setItem('@transacoes', JSON.stringify(transacoes)); }, [transacoes, dadosProntos]);
  useEffect(() => { if(dadosProntos) localStorage.setItem('@contas', JSON.stringify(contasGlobais)); }, [contasGlobais, dadosProntos]);
  useEffect(() => { if(dadosProntos) localStorage.setItem('@categorias', JSON.stringify(categoriasGlobais)); }, [categoriasGlobais, dadosProntos]);

  // ==========================================
  // INTEGRAÇÃO: GOOGLE DRIVE E BACKUP MANUAL
  // ==========================================
  const [googleToken, setGoogleToken] = useState(null);
  const [driveFileId, setDriveFileId] = useState(null);
  const [statusNuvem, setStatusNuvem] = useState('Desconectado');
  const [modalBackupVisivel, setModalBackupVisivel] = useState(false);
  const [textoImportacao, setTextoImportacao] = useState('');

  const iniciarLoginGoogle = () => {
    if (!window.google) { alert("Script do Google carregando. Adicione no index.html."); return; }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          setGoogleToken(tokenResponse.access_token);
          verificarArquivoNoDrive(tokenResponse.access_token);
        }
      },
    });
    client.requestAccessToken();
  };

  const verificarArquivoNoDrive = async (token) => {
    setStatusNuvem('Buscando dados na nuvem...');
    try {
      const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='financas_backup.json' and trashed=false&spaces=drive", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setDriveFileId(data.files[0].id); baixarDadosDoDrive(data.files[0].id, token);
      } else { setStatusNuvem('Nenhum backup encontrado. Salve para criar um novo.'); }
    } catch (e) { setStatusNuvem('Erro ao conectar ao Google Drive.'); }
  };

  const baixarDadosDoDrive = async (fileId, token) => {
    setStatusNuvem('Sincronizando...');
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      const dados = JSON.parse(text);
      if (dados.transacoes && dados.contasGlobais && dados.categoriasGlobais) {
        setTransacoes(dados.transacoes.map(t => ({ ...t, dataObj: new Date(t.dataObj) })));
        setContasGlobais(dados.contasGlobais); setCategoriasGlobais(dados.categoriasGlobais);
        setStatusNuvem('Sincronizado ✅'); alert('Dados restaurados da nuvem!');
      }
    } catch (e) { setStatusNuvem('Erro ao baixar os dados do Drive.'); }
  };

  const salvarNoDrive = async () => {
    if (!googleToken) { alert("Conecte-se ao Google primeiro."); return; }
    setStatusNuvem('Salvando na nuvem...');
    const dadosBackup = JSON.stringify({ transacoes, contasGlobais, categoriasGlobais, versao: '1.0', dataExportacao: new Date().toISOString() });
    const metadata = { name: 'financas_backup.json', mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([dadosBackup], { type: 'application/json' }));
    try {
      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';
      if (driveFileId) { url = `https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=multipart`; method = 'PATCH'; }
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${googleToken}` }, body: form });
      const data = await res.json();
      if (data.id) { setDriveFileId(data.id); setStatusNuvem('Sincronizado ✅'); }
    } catch (e) { setStatusNuvem('Erro ao salvar na nuvem.'); }
  };

  const exportarBackupManual = () => {
    try {
      const dadosBackup = JSON.stringify({ transacoes, contasGlobais, categoriasGlobais, versao: '1.0' }, null, 2);
      const blob = new Blob([dadosBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'backup_financas.json'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (error) { alert('Erro ao exportar backup.'); }
  };

  const selecionarArquivoEImportar = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dados = JSON.parse(e.target.result);
        if (dados.transacoes && dados.contasGlobais && dados.categoriasGlobais) {
          setTransacoes(dados.transacoes.map(t => ({ ...t, dataObj: new Date(t.dataObj) })));
          setContasGlobais(dados.contasGlobais); setCategoriasGlobais(dados.categoriasGlobais);
          setModalBackupVisivel(false); alert('Backup restaurado com sucesso!');
        } else { alert('Arquivo inválido.'); }
      } catch (err) { alert('Erro ao ler o arquivo.'); }
    };
    reader.readAsText(file);
  };

  const importarBackupManual = () => {
    try {
      if (!textoImportacao.trim()) { alert('Cole o texto do backup.'); return; }
      const dados = JSON.parse(textoImportacao);
      if (dados.transacoes && dados.contasGlobais && dados.categoriasGlobais) {
        setTransacoes(dados.transacoes.map(t => ({ ...t, dataObj: new Date(t.dataObj) })));
        setContasGlobais(dados.contasGlobais); setCategoriasGlobais(dados.categoriasGlobais);
        setTextoImportacao(''); setModalBackupVisivel(false); alert('Backup restaurado!');
      } else { alert('Arquivo inválido.'); }
    } catch (e) { alert('Erro ao ler texto.'); }
  };

  // ==========================================
  // ESTADOS GERAIS
  // ==========================================
  const [tipoLancamento, setTipoLancamento] = useState('Despesa');
  const [descInput, setDescInput] = useState('');
  const [valorInput, setValorInput] = useState('');
  const [obsInput, setObsInput] = useState(''); 
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [contaOrigem, setContaOrigem] = useState(''); 
  const [contaDestino, setContaDestino] = useState(''); 
  const [catSelecionada, setCatSelecionada] = useState('');
  const [subSelecionada, setSubSelecionada] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [dataSelecionadaObj, setDataSelecionadaObj] = useState(null); 
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesVisivelCalendario, setMesVisivelCalendario] = useState(new Date());
  const [qtdRepeticao, setQtdRepeticao] = useState('');
  const [transacaoEditando, setTransacaoEditando] = useState(null);
  const [modalAcaoSerie, setModalAcaoSerie] = useState(false);
  const [tipoAcaoSerie, setTipoAcaoSerie] = useState(null); 

  const [contasInativasRelat, setContasInativasRelat] = useState([]);
  const [dataInicioRelat, setDataInicioRelat] = useState(new Date(new Date().getFullYear(), 0, 1)); 
  const [dataFimRelat, setDataFimRelat] = useState(new Date(new Date().getFullYear(), 11, 31)); 
  const [textoBuscaRelat, setTextoBuscaRelat] = useState('');
  const [detalheCatTipo, setDetalheCatTipo] = useState(null); 
  const [detalheCatNome, setDetalheCatNome] = useState(null); 
  const [mesSelecionadoTooltip, setMesSelecionadoTooltip] = useState(null);
  const [modalDataRelatTipo, setModalDataRelatTipo] = useState(null); 
  const [mostrarCalendarioRelat, setMostrarCalendarioRelat] = useState(false);

  const [novaCatInput, setNovaCatInput] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState('despesa');
  const [novaContaInput, setNovaContaInput] = useState('');
  const [inputsSubcategoria, setInputsSubcategoria] = useState({});
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [catEditandoId, setCatEditandoId] = useState(null);
  const [catEditandoNome, setCatEditandoNome] = useState('');
  const [subEditandoObj, setSubEditandoObj] = useState(null);
  const [subEditandoNome, setSubEditandoNome] = useState('');
  
  const [dataAtualExtrato, setDataAtualExtrato] = useState(new Date()); 
  const [contasInativasExtrato, setContasInativasExtrato] = useState([]); 
  const [textoBuscaExtrato, setTextoBuscaExtrato] = useState('');

  const toggleCategoriaExpandida = (id) => setCategoriasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
  const formatarDataInput = (data) => `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  const formatarMoeda = (valor) => {
    if (isNaN(valor)) valor = 0;
    let partes = Number(valor).toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
  };

  const limparFormulario = () => {
    setDescInput(''); setValorInput(''); setObsInput(''); setQtdRepeticao(''); 
    setTransacaoEditando(null); setTipoLancamento('Despesa');
    setDataSelecionadaObj(null); setContaSelecionada(''); setContaOrigem(''); setContaDestino('');
    setCatSelecionada(''); setSubSelecionada(''); setRepeticao('');
  };

  const alternarAba = (aba) => { limparFormulario(); setAbaAtiva(aba); };
  const handleMudarTipoLancamento = (tipo) => { setTipoLancamento(tipo); setCatSelecionada(''); setSubSelecionada(''); };
  const handleSelecionarCategoria = (nomeCat) => { setCatSelecionada(nomeCat); setSubSelecionada(''); };
  const handleValorChange = (e) => {
    const text = e.target.value;
    const apenasNumeros = text.replace(/[^0-9]/g, '');
    if (!apenasNumeros) { setValorInput(''); return; }
    const valorDecimal = parseInt(apenasNumeros, 10) / 100;
    let formatado = valorDecimal.toFixed(2).replace('.', ',');
    formatado = formatado.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setValorInput(formatado);
  };

  const salvarLancamento = () => {
    if (contasGlobais.length === 0) { alert('Cadastre contas na aba Configurações.'); return; }
    if (!descInput.trim() || !valorInput.trim() || !dataSelecionadaObj) { alert('Preencha os campos obrigatórios (*).'); return; }
    if (tipoLancamento === 'Transf') {
      if (!contaOrigem || !contaDestino || contaOrigem === contaDestino) { alert('Verifique as contas de origem e destino.'); return; }
    } else {
      if (!contaSelecionada || !catSelecionada) { alert('Selecione Conta e Categoria.'); return; }
      const catObj = categoriasGlobais.find(c => c.nome === catSelecionada);
      if (catObj && catObj.subs.length > 0 && !subSelecionada) { alert('Selecione uma Subcategoria.'); return; }
    }
    if (!transacaoEditando && tipoLancamento !== 'Transf' && !repeticao) { alert('Selecione a Repetição.'); return; }

    const valorNumerico = parseFloat(valorInput.toString().replace(/\./g, '').replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) { alert('Valor inválido.'); return; }

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const idSerieUnica = 'SERIE-' + Date.now().toString();
    let loops = 1;
    if (repeticao === 'Fixo Mensal' || repeticao === 'Parcelado') {
      loops = parseInt(qtdRepeticao);
      if (!loops || loops < 1) { alert('Quantidade inválida.'); return; }
    }

    let novosLancamentos = [];
    for (let i = 0; i < loops; i++) {
      let dataLanc = new Date(dataSelecionadaObj.getFullYear(), dataSelecionadaObj.getMonth() + i, dataSelecionadaObj.getDate());
      let infoParcela = (repeticao === 'Parcelado') ? ` (${i + 1}/${loops})` : '';
      const baseLancamento = { dataObj: dataLanc, dia: String(dataLanc.getDate()).padStart(2, '0'), sem: diasSemana[dataLanc.getDay()], valor: valorNumerico, obs: obsInput, parcelaInfo: infoParcela, idSerie: idSerieUnica };

      if (tipoLancamento === 'Transf') {
        novosLancamentos.push({ ...baseLancamento, id: Date.now().toString() + 'D' + i, desc: (descInput || `Transf -> ${contaDestino}`) + infoParcela, tipo: 'despesa', conta: contaOrigem, cat: 'Transferência', sub: 'Enviada', status: 'pago' });
        novosLancamentos.push({ ...baseLancamento, id: Date.now().toString() + 'R' + i, desc: (descInput || `Transf de ${contaOrigem}`) + infoParcela, tipo: 'receita', conta: contaDestino, cat: 'Transferência', sub: 'Recebida', status: 'pago' });
      } else {
        novosLancamentos.push({ ...baseLancamento, id: Date.now().toString() + i, desc: descInput + infoParcela, tipo: tipoLancamento.toLowerCase(), conta: contaSelecionada, cat: catSelecionada, sub: subSelecionada || 'Único', status: 'pendente' });
      }
    }
    setTransacoes([...transacoes, ...novosLancamentos]); limparFormulario(); setAbaAtiva('Extrato');
  };

  const abrirEdicao = (item) => {
    setTransacaoEditando(item); setTipoLancamento(item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1));
    setDescInput(item.desc.replace(item.parcelaInfo, '').trim()); 
    let valorEdit = item.valor.toFixed(2).replace('.', ',');
    setValorInput(valorEdit.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setDataSelecionadaObj(item.dataObj); setContaSelecionada(item.conta); setCatSelecionada(item.cat); setSubSelecionada(item.sub);
    setObsInput(item.obs || ''); setRepeticao('Único'); setAbaAtiva('Editar');
  };

  const processarAcao = (acao) => { 
    const itensSérie = transacoes.filter(t => t.idSerie === transacaoEditando.idSerie);
    if (itensSérie.length > 1) { setTipoAcaoSerie(acao); setModalAcaoSerie(true); } else { executarAcaoSerie(acao, 'unico'); }
  };

  const executarAcaoSerie = (acao, modoAcao) => {
    const { id, idSerie, dataObj } = transacaoEditando; setModalAcaoSerie(false);
    if (acao === 'excluir') {
      let novaLista = [...transacoes];
      if (modoAcao === 'unico') novaLista = novaLista.filter(t => t.id !== id);
      else if (modoAcao === 'todos') novaLista = novaLista.filter(t => t.idSerie !== idSerie);
      else if (modoAcao === 'proximos') novaLista = novaLista.filter(t => !(t.idSerie === idSerie && t.dataObj.getTime() >= dataObj.getTime()));
      setTransacoes(novaLista); limparFormulario(); setAbaAtiva('Extrato');
    } else if (acao === 'editar') {
      const valorNumerico = parseFloat(valorInput.toString().replace(/\./g, '').replace(',', '.'));
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const listaAtualizada = transacoes.map(t => {
        let aplicaEdicao = (modoAcao === 'unico' && t.id === id) || (modoAcao === 'todos' && t.idSerie === idSerie) || (modoAcao === 'proximos' && t.idSerie === idSerie && t.dataObj.getTime() >= dataObj.getTime());
        if (aplicaEdicao) {
          let dataDoItem = dataSelecionadaObj;
          if (modoAcao !== 'unico') {
             const diffMeses = (t.dataObj.getFullYear() - dataObj.getFullYear()) * 12 + (t.dataObj.getMonth() - dataObj.getMonth());
             dataDoItem = new Date(dataSelecionadaObj.getFullYear(), dataSelecionadaObj.getMonth() + diffMeses, dataSelecionadaObj.getDate());
          }
          return { ...t, desc: descInput + (t.parcelaInfo || ''), valor: valorNumerico, dataObj: dataDoItem, dia: String(dataDoItem.getDate()).padStart(2, '0'), sem: diasSemana[dataDoItem.getDay()], tipo: tipoLancamento.toLowerCase(), conta: contaSelecionada, cat: catSelecionada, sub: subSelecionada, obs: obsInput };
        }
        return t;
      });
      setTransacoes(listaAtualizada); limparFormulario(); setAbaAtiva('Extrato');
    }
  };

  const mudarMesCalendario = (direcao) => setMesVisivelCalendario(new Date(mesVisivelCalendario.getFullYear(), mesVisivelCalendario.getMonth() + direcao, 1));
  const selecionarDia = (dia) => { setDataSelecionadaObj(new Date(mesVisivelCalendario.getFullYear(), mesVisivelCalendario.getMonth(), dia)); setMostrarCalendario(false); };

  const renderDiasCalendario = () => {
    const ano = mesVisivelCalendario.getFullYear(); const mes = mesVisivelCalendario.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate(); const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    let diasArray = Array(primeiroDiaSemana).fill(null); for (let i = 1; i <= diasNoMes; i++) diasArray.push(i);
    return (
      <div className="gradeDias">
        {diasArray.map((dia, index) => {
          if (!dia) return <div key={`vazio-${index}`} className="celulaDia" />;
          const isSelecionado = dataSelecionadaObj && dia === dataSelecionadaObj.getDate() && mes === dataSelecionadaObj.getMonth() && ano === dataSelecionadaObj.getFullYear();
          return <button key={`dia-${dia}`} className={`celulaDia ${isSelecionado ? 'celulaDiaSelecionado' : ''}`} onClick={() => selecionarDia(dia)}>{dia}</button>;
        })}
      </div>
    );
  };

  // Funções de Configuração
  const adicionarCategoria = () => { if(!novaCatInput.trim()) return; setCategoriasGlobais([...categoriasGlobais, { id: Date.now().toString(), nome: novaCatInput, tipo: novaCatTipo, cor: '#e2e8f0', subs: [] }]); setNovaCatInput(''); };
  const removerCategoria = (id) => { if(categoriasGlobais.length <= 1) { alert('Mantenha pelo menos uma categoria!'); return; } setCategoriasGlobais(categoriasGlobais.filter(c => c.id !== id)); };
  const salvarEdicaoCategoria = (catId) => { if (!catEditandoNome.trim()) return; setCategoriasGlobais(categoriasGlobais.map(cat => cat.id === catId ? { ...cat, nome: catEditandoNome.trim() } : cat)); setCatEditandoId(null); setCatEditandoNome(''); };
  const adicionarSubcategoria = (catId) => { const textoSub = inputsSubcategoria[catId]; if(!textoSub || !textoSub.trim()) return; setCategoriasGlobais(categoriasGlobais.map(cat => cat.id === catId ? { ...cat, subs: [...cat.subs, { id: Date.now().toString(), nome: textoSub }] } : cat)); setInputsSubcategoria({ ...inputsSubcategoria, [catId]: '' }); };
  const removerSubcategoria = (catId, subId) => { setCategoriasGlobais(categoriasGlobais.map(cat => cat.id === catId ? { ...cat, subs: cat.subs.filter(s => s.id !== subId) } : cat)); };
  const salvarEdicaoSubcategoria = (catId, subId) => { if (!subEditandoNome.trim()) return; setCategoriasGlobais(categoriasGlobais.map(cat => { if (cat.id === catId) { return { ...cat, subs: cat.subs.map(sub => sub.id === subId ? { ...sub, nome: subEditandoNome.trim() } : sub) }; } return cat; })); setSubEditandoObj(null); setSubEditandoNome(''); };
  const adicionarConta = () => { if(!novaContaInput.trim()) return; setContasGlobais([...contasGlobais, { id: Date.now().toString(), nome: novaContaInput }]); setNovaContaInput(''); };
  const removerConta = (id) => setContasGlobais(contasGlobais.filter(c => c.id !== id));

  // RENDER: Formulário
  const renderFormulario = (modo) => {
    const isEdit = modo === 'Editar';
    const categoriasExibidas = categoriasGlobais.filter(c => c.tipo === tipoLancamento.toLowerCase());
    const catAtualObj = categoriasExibidas.find(c => c.nome === catSelecionada);
    const listaSubsAtuais = catAtualObj ? catAtualObj.subs : [];

    return (
      <div className="containerGeral">
        <header className="headerLaranjaSimples">
          {isEdit && <button className="botaoVoltar" onClick={() => alternarAba('Extrato')}>⬅ Voltar</button>}
          <h2>{isEdit ? 'Editar Lançamento' : 'Visão de Caixa - Novo'}</h2>
        </header>

        <div className="areaTipos">
          <button className={`botaoTipo ${tipoLancamento === 'Receita' ? 'botaoTipoReceita' : ''}`} onClick={() => handleMudarTipoLancamento('Receita')}>RECEITA</button>
          <button className={`botaoTipo ${tipoLancamento === 'Despesa' ? 'botaoTipoDespesa' : ''}`} onClick={() => handleMudarTipoLancamento('Despesa')}>DESPESA</button>
          {!isEdit && <button className={`botaoTipo ${tipoLancamento === 'Transf' ? 'botaoTipoTransf' : ''}`} onClick={() => handleMudarTipoLancamento('Transf')}>TRANSF.</button>}
        </div>
        
        <div className="areaFormulario">
          <label className="labelForm">Descrição <span className="textoAsterisco">*</span></label>
          <input className="inputForm" placeholder="Ex: Mercado" value={descInput} onChange={(e) => setDescInput(e.target.value)} />
          <div className="linhaDupla">
            <div className="metadeCampo"><label className="labelForm">Valor (R$) <span className="textoAsterisco">*</span></label><input className="inputForm" placeholder="0,00" value={valorInput} onChange={handleValorChange} /></div>
            <div className="metadeCampo"><label className="labelForm">Data <span className="textoAsterisco">*</span></label><button className="inputFalsoDropdown" onClick={() => {setMesVisivelCalendario(dataSelecionadaObj || new Date()); setMostrarCalendario(true);}}><span className={!dataSelecionadaObj ? 'placeholderData' : ''}>{dataSelecionadaObj ? formatarDataInput(dataSelecionadaObj) : 'Selecione...'}</span><span>📅</span></button></div>
          </div>

          {tipoLancamento === 'Transf' ? (
            <>
              <label className="labelForm">Origem <span className="textoAsterisco">*</span></label>
              <div className="scrollSelecao">{contasGlobais.map(c => <button key={c.id} className={`botaoSelecao ${contaOrigem === c.nome ? 'selecionadoAmarelo' : ''}`} onClick={() => setContaOrigem(c.nome)}>{c.nome}</button>)}</div>
              <label className="labelForm">Destino <span className="textoAsterisco">*</span></label>
              <div className="scrollSelecao">{contasGlobais.map(c => <button key={c.id} className={`botaoSelecao ${contaDestino === c.nome ? 'selecionadoAmarelo' : ''}`} onClick={() => setContaDestino(c.nome)}>{c.nome}</button>)}</div>
            </>
          ) : (
            <>
              <label className="labelForm">Conta <span className="textoAsterisco">*</span></label>
              <div className="scrollSelecao">{contasGlobais.map(c => <button key={c.id} className={`botaoSelecao ${contaSelecionada === c.nome ? 'selecionadoAmarelo' : ''}`} onClick={() => setContaSelecionada(c.nome)}>{c.nome}</button>)}</div>
              <label className="labelForm">Categoria <span className="textoAsterisco">*</span></label>
              <div className="scrollSelecao">{categoriasExibidas.map(c => <button key={c.id} className={`botaoSelecao ${catSelecionada === c.nome ? 'selecionadoLaranja' : ''}`} onClick={() => handleSelecionarCategoria(c.nome)}>{c.nome}</button>)}</div>
              {listaSubsAtuais.length > 0 && (
                <><label className="labelForm">Subcategoria <span className="textoAsterisco">*</span></label><div className="scrollSelecao">{listaSubsAtuais.map(sub => <button key={sub.id} className={`botaoSelecao ${subSelecionada === sub.nome ? 'selecionadoVerde' : ''}`} onClick={() => setSubSelecionada(sub.nome)}>{sub.nome}</button>)}</div></>
              )}
            </>
          )}

          {!isEdit && tipoLancamento !== 'Transf' && (
            <><label className="labelForm">Repetição <span className="textoAsterisco">*</span></label>
              <select className="inputForm" value={repeticao} onChange={(e) => setRepeticao(e.target.value)}><option value="">Selecione...</option><option value="Único">Único</option><option value="Fixo Mensal">Fixo Mensal</option><option value="Parcelado">Parcelado</option></select>
              {(repeticao === 'Fixo Mensal' || repeticao === 'Parcelado') && (<div style={{marginTop: 5, marginBottom: 15}}><label className="labelForm">{repeticao === 'Fixo Mensal' ? 'Qtd Meses *' : 'Qtd Parcelas *'}</label><input className="inputForm" type="number" placeholder="Ex: 6" value={qtdRepeticao} onChange={(e) => setQtdRepeticao(e.target.value)} /></div>)}
            </>
          )}

          <label className="labelForm">Observações</label>
          <textarea className="inputForm" placeholder="Opcional..." value={obsInput} onChange={(e) => setObsInput(e.target.value)} rows="2" />

          {isEdit ? (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <button className="botaoSalvar" onClick={() => processarAcao('editar')}>SALVAR ALTERAÇÕES</button>
              <button className="botaoSalvar botaoExcluir" onClick={() => processarAcao('excluir')}>EXCLUIR LANÇAMENTO</button>
            </div>
          ) : (<button className="botaoSalvar" onClick={salvarLancamento}>SALVAR</button>)}
        </div>

        {mostrarCalendario && (
          <div className="modalOverlay">
            <div className="modalBox">
              <div className="headerModalCalendario"><button onClick={() => mudarMesCalendario(-1)}>{"<"}</button><strong>{mesesCompletos[mesVisivelCalendario.getMonth()]} {mesVisivelCalendario.getFullYear()}</strong><button onClick={() => mudarMesCalendario(1)}>{">"}</button></div>
              <div style={{display: 'flex', justifyContent: 'space-around', marginBottom: 10}}>{diasSemanaMin.map((ds,i) => <span key={i} style={{fontSize: 12, fontWeight: 'bold', color: '#999', width: 30, textAlign: 'center'}}>{ds}</span>)}</div>
              {renderDiasCalendario()}
              <div className="rodapeCalendario"><button onClick={() => setMostrarCalendario(false)}>Cancelar</button><button onClick={() => {setMesVisivelCalendario(new Date()); setDataSelecionadaObj(new Date()); setMostrarCalendario(false);}}>Hoje</button></div>
            </div>
          </div>
        )}

        {modalAcaoSerie && (
          <div className="modalOverlay">
            <div className="modalBox" style={{textAlign: 'center'}}>
              <h3 style={{marginBottom: 10}}>{tipoAcaoSerie === 'excluir' ? 'Excluir Lançamentos' : 'Editar Lançamentos'}</h3>
              <p style={{marginBottom: 20, fontSize: 14, color: '#666'}}>Este item faz parte de uma série. Como deseja {tipoAcaoSerie}?</p>
              <button className="botaoAcaoBranco" onClick={() => executarAcaoSerie(tipoAcaoSerie, 'unico')}>Apenas este</button>
              <button className="botaoAcaoAmarelo" onClick={() => executarAcaoSerie(tipoAcaoSerie, 'proximos')}>Este e os próximos</button>
              <button className="botaoAcaoVermelho" onClick={() => executarAcaoSerie(tipoAcaoSerie, 'todos')}>Todos da série</button>
              <button style={{marginTop: 15, background: 'none', border: 'none', color: '#999', fontWeight: 'bold'}} onClick={() => setModalAcaoSerie(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // RENDER: Extrato
  const renderExtrato = () => {
    const transacoesContaFiltrada = transacoes.filter(t => !contasInativasExtrato.includes(t.conta));
    const transacoesOrdenadasGeral = [...transacoesContaFiltrada].sort((a, b) => a.dataObj - b.dataObj);
    let runningPrev = 0, runningReal = 0;
    const transacoesComAcumulado = transacoesOrdenadasGeral.map(t => {
      const val = t.tipo === 'receita' ? t.valor : -t.valor; runningPrev += val; if (t.status === 'pago') runningReal += val;
      return { ...t, saldoAposItem: runningPrev, realAposItem: runningReal };
    });
    const transacoesMes = transacoesComAcumulado.filter(t => t.dataObj.getMonth() === dataAtualExtrato.getMonth() && t.dataObj.getFullYear() === dataAtualExtrato.getFullYear());
    const transacoesExibidas = transacoesMes.filter(t => {
      if (!textoBuscaExtrato) return true;
      const termo = textoBuscaExtrato.toLowerCase(); return (t.desc && t.desc.toLowerCase().includes(termo)) || (t.obs && t.obs.toLowerCase().includes(termo));
    });

    let recPagasMes = 0, recPrevistasMes = 0, pagPagasMes = 0, pagPrevistasMes = 0;
    transacoesMes.forEach(t => {
      if (t.tipo === 'receita') { recPrevistasMes += t.valor; if (t.status === 'pago') recPagasMes += t.valor; } 
      else { pagPrevistasMes += t.valor; if (t.status === 'pago') pagPagasMes += t.valor; }
    });

    const fimMesObj = new Date(dataAtualExtrato.getFullYear(), dataAtualExtrato.getMonth() + 1, 0, 23, 59, 59);
    const transacoesAteFimDoMes = transacoesComAcumulado.filter(t => t.dataObj <= fimMesObj);
    let saldoReal = 0, previstoFinal = 0;
    if (transacoesAteFimDoMes.length > 0) { const ultimaTrans = transacoesAteFimDoMes[transacoesAteFimDoMes.length - 1]; saldoReal = ultimaTrans.realAposItem; previstoFinal = ultimaTrans.saldoAposItem; } 
    else {
      const transacoesAntesDoMes = transacoesComAcumulado.filter(t => t.dataObj < new Date(dataAtualExtrato.getFullYear(), dataAtualExtrato.getMonth(), 1));
      if (transacoesAntesDoMes.length > 0) { const ultimaAntes = transacoesAntesDoMes[transacoesAntesDoMes.length - 1]; saldoReal = ultimaAntes.realAposItem; previstoFinal = ultimaAntes.saldoAposItem; }
    }

    return (
      <div className="containerGeral" style={{backgroundColor: '#f4f9fc'}}>
        <header className="headerLaranjaSimples" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <button style={{background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer'}} onClick={() => {const d = new Date(dataAtualExtrato); d.setMonth(d.getMonth()-1); setDataAtualExtrato(d);}}>{"<"}</button>
          <h2>{mesesAbv[dataAtualExtrato.getMonth()]}. {dataAtualExtrato.getFullYear()}</h2>
          <button style={{background:'none', border:'none', color:'white', fontSize:22, cursor:'pointer'}} onClick={() => {const d = new Date(dataAtualExtrato); d.setMonth(d.getMonth()+1); setDataAtualExtrato(d);}}>{">"}</button>
        </header>

        <div style={{backgroundColor: '#fff', padding: '10px 15px', borderBottom: '1px solid #e0e0e0', overflowX: 'auto', whiteSpace: 'nowrap'}}>
          {contasGlobais.length === 0 ? <span style={{fontSize:12, color:'#888'}}>Nenhuma conta.</span> : contasGlobais.map(c => {
            const isAtiva = !contasInativasExtrato.includes(c.nome);
            return <button key={c.id} style={{padding: '6px 12px', borderRadius: 8, marginRight: 10, background: isAtiva ? '#e2e8f0' : '#fff', border: `1px solid ${isAtiva ? '#cbd5e1' : '#e2e8f0'}`, color: isAtiva ? '#333' : '#a0a0a0', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => { contasInativasExtrato.includes(c.nome) ? setContasInativasExtrato(contasInativasExtrato.filter(x=>x!==c.nome)) : setContasInativasExtrato([...contasInativasExtrato, c.nome]); }}>{c.nome}</button>;
          })}
        </div>
        <div style={{padding: 10, backgroundColor: '#f0f4f8'}}><input className="inputForm" style={{marginBottom: 0, backgroundColor: '#e2e8f0'}} placeholder="🔍 Buscar..." value={textoBuscaExtrato} onChange={e => setTextoBuscaExtrato(e.target.value)} /></div>

        <div style={{flex: 1, overflowY: 'auto'}}>
          {transacoesExibidas.length === 0 ? <p style={{textAlign:'center', marginTop:50, color:'#999'}}>Nenhum lançamento encontrado.</p> : transacoesExibidas.map(item => (
            <div key={item.id} style={{display: 'flex', padding: '12px 15px', backgroundColor: '#fff', borderBottom: '1px solid #eef2f5', alignItems: 'center'}}>
              <div style={{width: 40, textAlign: 'center', marginRight: 10}} onClick={() => abrirEdicao(item)}><strong style={{fontSize: 18, color: '#333'}}>{item.dia}</strong><br/><span style={{fontSize: 12, color: '#888'}}>{item.sem}</span></div>
              <div style={{flex: 1, cursor: 'pointer'}} onClick={() => abrirEdicao(item)}>
                <div style={{fontSize: 15, color: '#333', marginBottom: 5, fontWeight: '500'}}>{item.desc}</div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                  <span style={{fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: '#edf2f7', color: '#475569', fontWeight: 'bold'}}>{item.conta}</span>
                  <span style={{fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: item.tipo === 'receita' ? '#e8f5e9' : '#ffebee', color: item.tipo === 'receita' ? '#4caf50' : '#e53935', fontWeight: 'bold'}}>{item.cat}</span>
                  <span style={{fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: '#f5f5f5', color: '#666', fontWeight: 'bold'}}>{item.sub}</span>
                </div>
              </div>
              <div style={{textAlign: 'right', marginRight: 10}} onClick={() => abrirEdicao(item)}>
                <strong style={{fontSize: 14, color: item.tipo === 'receita' ? '#4caf50' : '#e53935'}}>R$ {formatarMoeda(item.valor)}</strong><br/>
                <span style={{fontSize: 10, color: '#888'}}>R$ {formatarMoeda(item.saldoAposItem)}</span>
              </div>
              <div style={{width: 30, textAlign: 'center', cursor: 'pointer'}} onClick={() => setTransacoes(transacoes.map(t => t.id === item.id ? { ...t, status: t.status === 'pago' ? 'pendente' : 'pago' } : t))}>
                {item.status === 'pago' ? <div style={{width:22, height:22, borderRadius:'50%', backgroundColor:'#4caf50', display:'inline-flex', justifyContent:'center', alignItems:'center', color:'white', fontSize:12, fontWeight:'bold'}}>✓</div> : <div style={{width:22, height:22, borderRadius:'50%', border:'2px solid #ccc', display:'inline-block'}}></div>}
              </div>
            </div>
          ))}
          <div style={{height: 15}}></div>
        </div>

        <div style={{backgroundColor: '#2c3e50', padding: '10px 15px', borderTop: '1px solid #1a252f'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}><strong style={{color:'#fff', fontSize: 13}}>SALDO REAL</strong><strong style={{fontSize: 15, color: saldoReal >= 0 ? '#4caf50' : '#ff6b6b'}}>R$ {formatarMoeda(saldoReal)}</strong></div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#b0c4de'}}>
            <span>Rec. <strong style={{color:'#4caf50'}}>{formatarMoeda(recPagasMes)}</strong></span>
            <span>Prev. <strong style={{color:'#fff'}}>{formatarMoeda(recPrevistasMes)}</strong></span>
            <span>Pag. <strong style={{color:'#ff6b6b'}}>{formatarMoeda(pagPagasMes)}</strong></span>
            <span>Prev. <strong style={{color:'#fff'}}>{formatarMoeda(pagPrevistasMes)}</strong></span>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #34495e', paddingTop: 4}}><strong style={{color:'#f1c40f', fontSize: 12}}>PREVISTO FINAL</strong><strong style={{fontSize: 14, color: previstoFinal >= 0 ? '#4caf50' : '#ff6b6b'}}>R$ {formatarMoeda(previstoFinal)}</strong></div>
        </div>
      </div>
    );
  };

  // RENDER: Relatório (COMPLETO)
  const renderRelatorio = () => {
    const toggleConta = (nomeConta) => { contasInativasRelat.includes(nomeConta) ? setContasInativasRelat(contasInativasRelat.filter(c => c !== nomeConta)) : setContasInativasRelat([...contasInativasRelat, nomeConta]); };

    const transacoesFiltradasRelatorio = transacoes.filter(t => {
      if (contasInativasRelat.includes(t.conta)) return false;
      const tTime = new Date(t.dataObj.getFullYear(), t.dataObj.getMonth(), t.dataObj.getDate()).getTime();
      const iniTime = new Date(dataInicioRelat.getFullYear(), dataInicioRelat.getMonth(), dataInicioRelat.getDate()).getTime();
      const fimTime = new Date(dataFimRelat.getFullYear(), dataFimRelat.getMonth(), dataFimRelat.getDate()).getTime();
      if (tTime < iniTime || tTime > fimTime) return false;
      if (textoBuscaRelat) {
        const termo = textoBuscaRelat.toLowerCase();
        if (!(t.desc && t.desc.toLowerCase().includes(termo)) && !(t.obs && t.obs.toLowerCase().includes(termo))) return false;
      }
      return true;
    });

    let totalReceitasRelat = 0, totalDespesasRelat = 0;
    let receitasPorCategoria = {}, receitasPorSubcategoria = {};
    let despesasPorCategoria = {}, despesasPorSubcategoria = {};

    transacoesFiltradasRelatorio.forEach(t => {
      if (t.tipo === 'receita') {
        totalReceitasRelat += t.valor; receitasPorCategoria[t.cat] = (receitasPorCategoria[t.cat] || 0) + t.valor;
        if (!receitasPorSubcategoria[t.cat]) receitasPorSubcategoria[t.cat] = {};
        receitasPorSubcategoria[t.cat][t.sub] = (receitasPorSubcategoria[t.cat][t.sub] || 0) + t.valor;
      } else if (t.tipo === 'despesa') {
        totalDespesasRelat += t.valor; despesasPorCategoria[t.cat] = (despesasPorCategoria[t.cat] || 0) + t.valor;
        if (!despesasPorSubcategoria[t.cat]) despesasPorSubcategoria[t.cat] = {};
        despesasPorSubcategoria[t.cat][t.sub] = (despesasPorSubcategoria[t.cat][t.sub] || 0) + t.valor;
      }
    });

    const maxValRecDesp = Math.max(totalReceitasRelat, totalDespesasRelat, 1);
    const larguraReceitaPct = Math.max((totalReceitasRelat / maxValRecDesp) * 100, 15);
    const larguraDespesaPct = Math.max((totalDespesasRelat / maxValRecDesp) * 100, 15);

    let dadosTendenciaMensal = {};
    transacoesFiltradasRelatorio.forEach(t => {
      const mesAnoKey = `${String(t.dataObj.getMonth()+1).padStart(2, '0')}/${t.dataObj.getFullYear()}`;
      if (!dadosTendenciaMensal[mesAnoKey]) dadosTendenciaMensal[mesAnoKey] = { mesIndex: t.dataObj.getMonth(), ano: t.dataObj.getFullYear(), receita: 0, despesa: 0 };
      if (t.tipo === 'receita') dadosTendenciaMensal[mesAnoKey].receita += t.valor;
      else if (t.tipo === 'despesa') dadosTendenciaMensal[mesAnoKey].despesa += t.valor;
    });

    const mesesTendenciaOrdenados = Object.entries(dadosTendenciaMensal).sort((a, b) => {
      const [m1, y1] = a[0].split('/').map(Number); const [m2, y2] = b[0].split('/').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });
    const maxValTendencia = Math.max(...mesesTendenciaOrdenados.map(([_, d]) => Math.max(d.receita, d.despesa)), 1);

    return (
      <div className="containerGeral" style={{backgroundColor: '#f4f9fc'}}>
        <header className="headerLaranjaSimples"><h2>Relatórios e Busca</h2></header>
        
        <div style={{flex: 1, overflowY: 'auto'}}>
          <div style={{backgroundColor: '#fff', padding: '10px 15px', borderBottom: '1px solid #e0e0e0', overflowX: 'auto', whiteSpace: 'nowrap'}}>
            {contasGlobais.length === 0 ? <span style={{fontSize:12, color:'#888'}}>Nenhuma conta.</span> : contasGlobais.map(c => {
              const isAtiva = !contasInativasRelat.includes(c.nome);
              return <button key={c.id} style={{padding: '6px 12px', borderRadius: 8, marginRight: 10, background: isAtiva ? '#e2e8f0' : '#fff', border: `1px solid ${isAtiva ? '#cbd5e1' : '#e2e8f0'}`, color: isAtiva ? '#333' : '#a0a0a0', cursor: 'pointer', fontWeight: 'bold'}} onClick={() => toggleConta(c.nome)}>{c.nome}</button>;
            })}
          </div>

          <div style={{display: 'flex', padding: 10, justifyContent: 'space-between', backgroundColor: '#fff', borderBottom: '1px solid #eee'}}>
            <button style={{flex: 1, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 10, display: 'flex', justifyContent: 'space-between', marginRight: 5, cursor: 'pointer'}} onClick={() => { setModalDataRelatTipo('inicio'); setMesVisivelCalendario(dataInicioRelat); setMostrarCalendarioRelat(true); }}>
              <span style={{fontSize: 14, color: '#333'}}>{formatarDataInput(dataInicioRelat)}</span><span>📅</span>
            </button>
            <button style={{flex: 1, backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 10, display: 'flex', justifyContent: 'space-between', marginLeft: 5, cursor: 'pointer'}} onClick={() => { setModalDataRelatTipo('fim'); setMesVisivelCalendario(dataFimRelat); setMostrarCalendarioRelat(true); }}>
              <span style={{fontSize: 14, color: '#333'}}>{formatarDataInput(dataFimRelat)}</span><span>📅</span>
            </button>
          </div>

          <div style={{padding: 10, backgroundColor: '#f0f4f8'}}><input className="inputForm" style={{marginBottom: 0, backgroundColor: '#e2e8f0'}} placeholder="🔍 Buscar por descrição ou obs..." value={textoBuscaRelat} onChange={e => setTextoBuscaRelat(e.target.value)} /></div>

          <div style={{padding: 15}}>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: 15}}>
              <div style={{display: 'flex', alignItems: 'center', marginRight: 15}}><div style={{width: 12, height: 12, backgroundColor: '#4caf50', marginRight: 5}}></div><span style={{fontSize: 12, color: '#555'}}>Receitas</span></div>
              <div style={{display: 'flex', alignItems: 'center'}}><div style={{width: 12, height: 12, backgroundColor: '#e53935', marginRight: 5}}></div><span style={{fontSize: 12, color: '#555'}}>Despesas</span></div>
            </div>

            <div style={{width: '100%', marginBottom: 15}}>
              <div style={{width: '100%', backgroundColor: '#e9ecef', borderRadius: 6, marginBottom: 8, overflow: 'hidden'}}>
                <div style={{backgroundColor: '#4caf50', padding: 12, width: `${larguraReceitaPct}%`, minWidth: 120, color: '#fff', fontWeight: 'bold'}}>R$ {formatarMoeda(totalReceitasRelat)}</div>
              </div>
              <div style={{width: '100%', backgroundColor: '#e9ecef', borderRadius: 6, overflow: 'hidden'}}>
                <div style={{backgroundColor: '#e53935', padding: 12, width: `${larguraDespesaPct}%`, minWidth: 120, color: '#fff', fontWeight: 'bold'}}>R$ {formatarMoeda(totalDespesasRelat)}</div>
              </div>
            </div>

            {/* DETALHAMENTO CATEGORIAS */}
            {['receita', 'despesa'].map(tipoAtual => {
              const isReceita = tipoAtual === 'receita';
              const categoriasMap = isReceita ? receitasPorCategoria : despesasPorCategoria;
              const subcategoriasMap = isReceita ? receitasPorSubcategoria : despesasPorSubcategoria;
              const totalRelat = isReceita ? totalReceitasRelat : totalDespesasRelat;
              const corTema = isReceita ? '#4caf50' : '#ff9800';
              const titulo = isReceita ? 'RECEITAS POR CATEGORIA' : 'DESPESAS POR CATEGORIA';

              if (detalheCatTipo === tipoAtual) {
                const subsDaCat = subcategoriasMap[detalheCatNome] || {};
                const totalCatVal = categoriasMap[detalheCatNome] || 1;
                return (
                  <div key={`detalhe-${tipoAtual}`} style={{width: '100%', marginTop: 20}}>
                    <button style={{backgroundColor: '#2196f3', color: '#fff', padding: 10, borderRadius: 6, width: '100%', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginBottom: 10}} onClick={() => { setDetalheCatTipo(null); setDetalheCatNome(null); }}>⬅ Voltar para {isReceita ? 'Receitas' : 'Despesas'}</button>
                    <h4 style={{textAlign: 'center', marginBottom: 15}}>SUBCAT: {detalheCatNome} (R$ {formatarMoeda(categoriasMap[detalheCatNome] || 0)})</h4>
                    {Object.keys(subsDaCat).length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>Nenhuma subcategoria.</p> : Object.entries(subsDaCat).map(([sub, subVal], idx) => {
                      const percentSub = ((subVal / totalCatVal) * 100).toFixed(1);
                      const coresSub = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#ec407a'];
                      const corAtual = coresSub[idx % coresSub.length];
                      return (
                        <div key={sub} style={{backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, border: '1px solid #ddd'}}>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 5}}><strong style={{color: '#555'}}>🔹 {sub}</strong><strong style={{color: corAtual}}>R$ {formatarMoeda(subVal)} ({percentSub}%)</strong></div>
                          <div style={{height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden'}}><div style={{width: `${percentSub}%`, height: '100%', backgroundColor: corAtual}}></div></div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (!detalheCatTipo) {
                return (
                  <div key={`lista-${tipoAtual}`} style={{width: '100%', marginTop: 20}}>
                    <h4 style={{marginBottom: 10, fontSize: 14}}>{titulo} <span style={{fontSize: 10, color: '#888'}}>(Toque)</span></h4>
                    {Object.keys(categoriasMap).length === 0 ? <p style={{color: '#999', fontSize: 13}}>Nenhum registro.</p> : Object.entries(categoriasMap).map(([cat, val], idx) => {
                      const percent = totalRelat > 0 ? ((val / totalRelat) * 100).toFixed(1) : 0;
                      const coresCat = isReceita ? ['#4caf50', '#81c784', '#66bb6a', '#388e3c'] : ['#ffa726', '#ec407a', '#ab47bc', '#26a69a'];
                      const corAtual = coresCat[idx % coresCat.length];
                      return (
                        <div key={cat} style={{backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, border: `1px solid ${corTema}`, cursor: 'pointer'}} onClick={() => { setDetalheCatTipo(tipoAtual); setDetalheCatNome(cat); }}>
                          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 5}}><strong style={{color: '#333'}}>📂 {cat} ➔</strong><strong style={{color: corAtual}}>R$ {formatarMoeda(val)} ({percent}%)</strong></div>
                          <div style={{height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden'}}><div style={{width: `${percent}%`, height: '100%', backgroundColor: corAtual}}></div></div>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })}

            <h4 style={{marginTop: 35, marginBottom: 5, fontSize: 14}}>TENDÊNCIA MENSAL</h4>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: 15}}>
              <div style={{display: 'flex', alignItems: 'center', marginRight: 15}}><div style={{width: 10, height: 10, backgroundColor: '#4caf50', marginRight: 4}}></div><span style={{fontSize: 11, color: '#555'}}>Receitas</span></div>
              <div style={{display: 'flex', alignItems: 'center'}}><div style={{width: 10, height: 10, backgroundColor: '#e53935', marginRight: 4}}></div><span style={{fontSize: 11, color: '#555'}}>Despesas</span></div>
            </div>

            {mesSelecionadoTooltip && (
              <div style={{backgroundColor: '#333', padding: 10, borderRadius: 6, marginBottom: 12, textAlign: 'center', color: '#fff'}}>
                <div style={{fontWeight: 'bold', fontSize: 13, marginBottom: 4}}>{mesSelecionadoTooltip.nome}</div>
                <div style={{color: '#4caf50', fontSize: 12, fontWeight: 'bold'}}>🟢 Receitas: R$ {formatarMoeda(mesSelecionadoTooltip.rec)}</div>
                <div style={{color: '#ff6b6b', fontSize: 12, fontWeight: 'bold'}}>🔴 Despesas: R$ {formatarMoeda(mesSelecionadoTooltip.desp)}</div>
                <button style={{background: 'none', border: 'none', color: '#007aff', fontSize: 10, fontWeight: 'bold', marginTop: 5, cursor: 'pointer'}} onClick={() => setMesSelecionadoTooltip(null)}>Fechar [X]</button>
              </div>
            )}

            <div style={{overflowX: 'auto', display: 'flex', paddingBottom: 15}}>
              {mesesTendenciaOrdenados.length === 0 ? <p style={{color: '#999'}}>Nenhum dado.</p> : mesesTendenciaOrdenados.map(([chave, dados]) => {
                const alturaRec = Math.max((dados.receita / maxValTendencia) * 120, dados.receita > 0 ? 15 : 4);
                const alturaDesp = Math.max((dados.despesa / maxValTendencia) * 120, dados.despesa > 0 ? 15 : 4);
                const nomeMesAno = `${mesesAbv[dados.mesIndex]}. ${String(dados.ano).slice(-2)}`;
                return (
                  <div key={chave} onClick={() => setMesSelecionadoTooltip({ nome: nomeMesAno, rec: dados.receita, desp: dados.despesa })} style={{minWidth: 70, textAlign: 'center', cursor: 'pointer', backgroundColor: mesSelecionadoTooltip?.nome === nomeMesAno ? '#eef2f5' : 'transparent', borderRadius: 8, padding: '5px 0'}}>
                    <div style={{display: 'flex', alignItems: 'flex-end', height: 130, justifyContent: 'space-between', borderBottom: '1px solid #ccc', padding: '0 5px'}}>
                      <div style={{width: 26, height: alturaRec, backgroundColor: '#4caf50', borderRadius: '2px 2px 0 0', display: 'flex', justifyContent: 'center'}}><span style={{color: '#fff', fontSize: 8, fontWeight: 'bold', transform: 'rotate(-90deg)', marginTop: 10, display: dados.receita > 0 ? 'block' : 'none'}}>R${Math.round(dados.receita)}</span></div>
                      <div style={{width: 26, height: alturaDesp, backgroundColor: '#e53935', borderRadius: '2px 2px 0 0', display: 'flex', justifyContent: 'center'}}><span style={{color: '#fff', fontSize: 8, fontWeight: 'bold', transform: 'rotate(-90deg)', marginTop: 10, display: dados.despesa > 0 ? 'block' : 'none'}}>R${Math.round(dados.despesa)}</span></div>
                    </div>
                    <div style={{fontSize: 10, color: '#333', fontWeight: 'bold', marginTop: 6}}>{nomeMesAno}</div>
                  </div>
                );
              })}
            </div>

            <h4 style={{marginTop: 15, marginBottom: 10, fontSize: 14}}>LANÇAMENTOS ({transacoesFiltradasRelatorio.length})</h4>
            {transacoesFiltradasRelatorio.map(item => (
              <div key={item.id} style={{display: 'flex', padding: '12px 10px', backgroundColor: '#fff', borderBottom: '1px solid #eef2f5', alignItems: 'center', cursor: 'pointer'}} onClick={() => abrirEdicao(item)}>
                <div style={{width: 75, textAlign: 'center', marginRight: 10}}><strong style={{fontSize: 12, color: '#333'}}>{formatarDataInput(item.dataObj)}</strong></div>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 15, color: '#333', marginBottom: 5}}>{item.desc}</div>
                  <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                    <span style={{fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: '#edf2f7', color: '#475569'}}>{item.conta}</span>
                    <span style={{fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: item.tipo === 'receita' ? '#e8f5e9' : '#ffebee', color: item.tipo === 'receita' ? '#4caf50' : '#e53935'}}>{item.cat}</span>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}><strong style={{fontSize: 14, color: item.tipo === 'receita' ? '#4caf50' : '#e53935'}}>R$ {formatarMoeda(item.valor)}</strong></div>
              </div>
            ))}
          </div>
          <div style={{height: 40}}></div>
        </div>

        {mostrarCalendarioRelat && (
          <div className="modalOverlay">
            <div className="modalBox">
              <div className="headerModalCalendario"><button onClick={() => mudarMesCalendario(-1)}>{"<"}</button><strong>{mesesCompletos[mesVisivelCalendario.getMonth()]} {mesVisivelCalendario.getFullYear()}</strong><button onClick={() => mudarMesCalendario(1)}>{">"}</button></div>
              <div style={{display: 'flex', justifyContent: 'space-around', marginBottom: 10}}>{diasSemanaMin.map((ds,i) => <span key={i} style={{fontSize: 12, fontWeight: 'bold', color: '#999', width: 30, textAlign: 'center'}}>{ds}</span>)}</div>
              <div className="gradeDias">
                {(() => {
                  const ano = mesVisivelCalendario.getFullYear(); const mes = mesVisivelCalendario.getMonth();
                  const diasNoMes = new Date(ano, mes + 1, 0).getDate(); const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
                  let diasArray = Array(primeiroDiaSemana).fill(null); for (let i = 1; i <= diasNoMes; i++) diasArray.push(i);
                  return diasArray.map((dia, index) => {
                    if (!dia) return <div key={`vazio-${index}`} className="celulaDia" />;
                    return <button key={`d-${dia}`} className="celulaDia" onClick={() => {
                      const novaD = new Date(ano, mes, dia);
                      modalDataRelatTipo === 'inicio' ? setDataInicioRelat(novaD) : setDataFimRelat(novaD);
                      setMostrarCalendarioRelat(false);
                    }}>{dia}</button>;
                  });
                })()}
              </div>
              <div className="rodapeCalendario"><button onClick={() => setMostrarCalendarioRelat(false)}>Cancelar</button></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // RENDER: Configurações
  const renderConfig = () => {
    const categoriasConfigExibidas = categoriasGlobais.filter(cat => cat.tipo === novaCatTipo);
    return (
      <div className="containerGeral">
        <header className="headerLaranjaSimples"><h2>Configurações</h2></header>
        <div className="areaFormulario">
          
          <div style={{backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #90caf9'}}>
            <h3 style={{margin: '0 0 10px 0', color: '#1565c0', fontSize: 14}}>☁️ Nuvem e Backup do Visão de Caixa</h3>
            <p style={{fontSize: '12px', color: '#555', marginBottom: '15px'}}>Sincronize com o seu Google Drive para usar em qualquer celular ou PC.</p>
            {!googleToken ? (
              <button onClick={iniciarLoginGoogle} style={{backgroundColor: '#4285f4', color: '#fff', padding: '10px 15px', border: 'none', borderRadius: '4px', fontWeight: 'bold', width: '100%', cursor: 'pointer'}}>Entrar com o Google</button>
            ) : (
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={salvarNoDrive} style={{flex: 1, backgroundColor: '#4caf50', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'}}>⬆️ Salvar</button>
                <button onClick={() => googleToken && driveFileId && baixarDadosDoDrive(driveFileId, googleToken)} disabled={!driveFileId} style={{flex: 1, backgroundColor: driveFileId ? '#ff9800' : '#ccc', color: '#fff', padding: '10px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: driveFileId ? 'pointer' : 'not-allowed'}}>⬇️ Restaurar</button>
              </div>
            )}
            <p style={{fontSize: '11px', marginTop: '10px', fontWeight: 'bold', color: statusNuvem.includes('Erro') ? '#d32f2f' : '#333'}}>Status: {statusNuvem}</p>
          </div>

          <label className="labelForm">Backup Físico (Arquivo)</label>
          <div className="linhaDupla" style={{marginBottom: '25px'}}>
            <button className="botaoSalvar" style={{flex: 1, backgroundColor: '#2196f3', marginBottom: 0, padding: '10px'}} onClick={exportarBackupManual}>📤 EXPORTAR</button>
            <button className="botaoSalvar" style={{flex: 1, backgroundColor: '#4caf50', marginBottom: 0, padding: '10px'}} onClick={() => setModalBackupVisivel(true)}>📥 IMPORTAR</button>
          </div>

          <label className="labelForm">Gerenciar Contas</label>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <input className="inputForm" style={{marginBottom: 0, flex: 1}} placeholder="Nova Conta..." value={novaContaInput} onChange={(e) => setNovaContaInput(e.target.value)} />
            <button className="botaoSalvar" style={{width: 'auto', padding: '0 20px', marginBottom: 0}} onClick={adicionarConta}>ADD</button>
          </div>
          <div style={{background: '#fff', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', marginBottom: 30}}>
            {contasGlobais.map(c => (<div key={c.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0'}}><span style={{fontWeight: 'bold', color: '#333', fontSize: 14}}>{c.nome}</span><button onClick={() => removerConta(c.id)} style={{background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: 16}}>🗑️</button></div>))}
          </div>

          <label className="labelForm">Gerenciar Categorias</label>
          <div style={{display: 'flex', marginBottom: '10px'}}>
            <button style={{padding: '6px 12px', borderRadius: 8, marginRight: 10, background: novaCatTipo === 'receita' ? '#4caf50' : '#eee', color: novaCatTipo === 'receita' ? '#fff' : '#666', border: 'none', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => setNovaCatTipo('receita')}>Receita</button>
            <button style={{padding: '6px 12px', borderRadius: 8, background: novaCatTipo === 'despesa' ? '#e53935' : '#eee', color: novaCatTipo === 'despesa' ? '#fff' : '#666', border: 'none', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => setNovaCatTipo('despesa')}>Despesa</button>
          </div>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <input className="inputForm" style={{marginBottom: 0, flex: 1}} placeholder="Nova Categoria..." value={novaCatInput} onChange={(e) => setNovaCatInput(e.target.value)} />
            <button className="botaoSalvar" style={{width: 'auto', padding: '0 20px', marginBottom: 0}} onClick={adicionarCategoria}>ADD</button>
          </div>

          {categoriasConfigExibidas.map(cat => {
            const isExpandido = categoriasExpandidas[cat.id] ?? false;
            const isEditandoCat = catEditandoId === cat.id;
            return (
              <div key={cat.id} style={{backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '15px', overflow: 'hidden'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: '15px', borderBottom: '1px solid #eeeeee', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer'}} onClick={() => toggleCategoriaExpandida(cat.id)}>
                    <span style={{color: cat.tipo === 'receita' ? '#4caf50' : '#e53935', fontSize: 16, marginRight: 6}}>●</span>
                    {isEditandoCat ? <input className="inputForm" style={{marginBottom: 0, padding: 5, flex: 1, marginRight: 10}} value={catEditandoNome} onChange={e => setCatEditandoNome(e.target.value)} autoFocus /> : <span style={{fontSize: 14, fontWeight: 'bold', color: '#333'}}>{cat.nome} <span style={{fontSize: 12, color: '#888'}}>({cat.subs.length})</span></span>}
                  </div>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    {isEditandoCat ? <button onClick={() => salvarEdicaoCategoria(cat.id)} style={{background: 'none', border: 'none', color: '#4caf50', fontWeight: 'bold', marginRight: 10, cursor: 'pointer'}}>Salvar</button> : <button onClick={() => { setCatEditandoId(cat.id); setCatEditandoNome(cat.nome); }} style={{background: 'none', border: 'none', marginRight: 10, cursor: 'pointer', fontSize: 16}}>✏️</button>}
                    <button onClick={() => removerCategoria(cat.id)} style={{background: 'none', border: 'none', marginRight: 10, cursor: 'pointer', fontSize: 16}}>🗑️</button>
                    <span style={{fontSize: 12, color: '#666', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => toggleCategoriaExpandida(cat.id)}>{isExpandido ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpandido && (
                  <div style={{padding: '10px'}}>
                    {cat.subs.map(sub => {
                      const isEditandoSub = subEditandoObj?.catId === cat.id && subEditandoObj?.subId === sub.id;
                      return (
                        <div key={sub.id} style={{display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #f0f0f0', alignItems: 'center'}}>
                          {isEditandoSub ? <input className="inputForm" style={{marginBottom: 0, padding: 5, flex: 1, marginRight: 10}} value={subEditandoNome} onChange={e => setSubEditandoNome(e.target.value)} autoFocus /> : <span style={{fontSize: 13, color: '#666'}}>{sub.nome}</span>}
                          <div>
                            {isEditandoSub ? <button onClick={() => salvarEdicaoSubcategoria(cat.id, sub.id)} style={{background: 'none', border: 'none', color: '#4caf50', fontWeight: 'bold', marginRight: 10, cursor: 'pointer'}}>Salvar</button> : <button onClick={() => { setSubEditandoObj({ catId: cat.id, subId: sub.id }); setSubEditandoNome(sub.nome); }} style={{background: 'none', border: 'none', marginRight: 10, cursor: 'pointer', fontSize: 14}}>✏️</button>}
                            <button onClick={() => removerSubcategoria(cat.id, sub.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 14}}>🗑️</button>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{display: 'flex', gap: 10, marginTop: 10}}>
                      <input className="inputForm" style={{marginBottom: 0, flex: 1, padding: 5, fontSize: 12}} placeholder={`Nova sub em ${cat.nome}`} value={inputsSubcategoria[cat.id] || ''} onChange={e => setInputsSubcategoria({...inputsSubcategoria, [cat.id]: e.target.value})} />
                      <button className="botaoSalvar" style={{width: 'auto', padding: '0 15px', marginBottom: 0, fontSize: 12}} onClick={() => adicionarSubcategoria(cat.id)}>ADD</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {modalBackupVisivel && (
          <div className="modalOverlay">
            <div className="modalBox">
              <h3 style={{marginBottom: 15}}>Restaurar Backup</h3>
              <input type="file" onChange={selecionarArquivoEImportar} accept=".json" style={{marginBottom: '15px'}} />
              <textarea className="inputForm" placeholder="Ou cole o JSON aqui..." value={textoImportacao} onChange={(e) => setTextoImportacao(e.target.value)} rows="4" />
              <div className="rodapeCalendario">
                <button onClick={() => setModalBackupVisivel(false)} style={{color: 'red'}}>Cancelar</button>
                <button onClick={importarBackupManual}>Restaurar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="appContainer">
      <div className="areaConteudo">
        {abaAtiva === 'Lancar' && renderFormulario('Lancar')}
        {abaAtiva === 'Editar' && renderFormulario('Editar')}
        {abaAtiva === 'Extrato' && renderExtrato()}
        {abaAtiva === 'Relatorio' && renderRelatorio()}
        {abaAtiva === 'Config' && renderConfig()}
      </div>
      <nav className="menuInferior">
        <button className={`botaoMenu ${abaAtiva === 'Lancar' ? 'ativo' : ''}`} onClick={() => alternarAba('Lancar')}><span style={{fontSize: 22, marginBottom: 4}}>➕</span>Lançar</button>
        <button className={`botaoMenu ${abaAtiva === 'Extrato' ? 'ativo' : ''}`} onClick={() => alternarAba('Extrato')}><span style={{fontSize: 22, marginBottom: 4}}>🗂️</span>Extrato</button>
        <button className={`botaoMenu ${abaAtiva === 'Relatorio' ? 'ativo' : ''}`} onClick={() => alternarAba('Relatorio')}><span style={{fontSize: 22, marginBottom: 4}}>📊</span>Relatório</button>
        <button className={`botaoMenu ${abaAtiva === 'Config' ? 'ativo' : ''}`} onClick={() => alternarAba('Config')}><span style={{fontSize: 22, marginBottom: 4}}>⚙️</span>Config</button>
      </nav>
    </div>
  );
}