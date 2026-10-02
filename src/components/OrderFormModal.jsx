import { useState } from 'react'
import { supabase } from '../supabaseClient'

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Máscaras de entrada ──────────────────────────────────────────────────────
function mascaraTelefone(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

function mascaraCEP(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
}

export default function OrderFormModal({
  carrinho,
  total,
  aberto,
  onFechar,
  onPedidoConcluido,
  mostrarToast,
}) {
  // ── Estados do Formulário ──────────────────────────────────────────────────
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('delivery') // 'delivery' | 'retirada'
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [complemento, setComplemento] = useState('')
  const [pontoReferencia, setPontoReferencia] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('pix') // 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro'
  const [precisaTroco, setPrecisaTroco] = useState(false)
  const [trocoPara, setTrocoPara] = useState('')
  const [observacoes, setObservacoes] = useState('')

  // ── Estados de controle e feedback ─────────────────────────────────────────
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [recibo, setRecibo] = useState(null) // Guarda dados do pedido realizado

  if (!aberto) return null

  function handleVibrate(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  // ── Buscar CEP automaticamente (ViaCEP) ───────────────────────────────────
  async function consultarCep(cepValue) {
    const raw = cepValue.replace(/\D/g, '')
    if (raw.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await res.json()
      if (data.erro) {
        setErros(prev => ({ ...prev, cep: 'CEP não encontrado.' }))
      } else {
        setRua(data.logradouro || '')
        setBairro(data.bairro || '')
        setErros(prev => {
          const copia = { ...prev }
          delete copia.cep
          return copia
        })
        handleVibrate(50)
      }
    } catch {
      setErros(prev => ({ ...prev, cep: 'Não foi possível consultar o CEP.' }))
    } finally {
      setBuscandoCep(false)
    }
  }

  // ── Obter Localização via GPS (Geolocation API móvel) ──────────────────────
  function obterLocalizacaoGps() {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador/dispositivo.')
      return
    }

    handleVibrate(30)
    setBuscandoGps(true)

    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords
        try {
          // Geocodificação reversa usando OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          )
          const data = await res.json()
          if (data && data.address) {
            const addr = data.address
            const logradouro = addr.road || addr.street || addr.suburb || ''
            const num = addr.house_number || ''
            const bairroLocal = addr.neighbourhood || addr.suburb || addr.city_district || ''
            const cepLocal = addr.postcode || ''

            if (logradouro) setRua(logradouro)
            if (num) setNumero(num)
            if (bairroLocal) setBairro(bairroLocal)
            if (cepLocal) setCep(mascaraCEP(cepLocal))

            setPontoReferencia(prev => prev || `📍 GPS: Lat ${latitude.toFixed(4)}, Long ${longitude.toFixed(4)}`)
          } else {
            setPontoReferencia(`📍 GPS: Lat ${latitude.toFixed(4)}, Long ${longitude.toFixed(4)}`)
          }
          handleVibrate(60)
        } catch {
          setPontoReferencia(`📍 GPS: Lat ${latitude.toFixed(4)}, Long ${longitude.toFixed(4)}`)
        } finally {
          setBuscandoGps(false)
        }
      },
      error => {
        setBuscandoGps(false)
        console.warn('Erro ao obter GPS:', error)
        alert('Não foi possível obter a sua localização. Verifique as permissões de GPS no seu celular.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  // ── Validação do Formulário de Entrada de Dados ───────────────────────────
  function validarFormulario() {
    const novosErros = {}

    if (!nome.trim() || nome.trim().length < 3) {
      novosErros.nome = 'Informe seu nome completo (mínimo 3 caracteres).'
    }

    const telDigits = telefone.replace(/\D/g, '')
    if (telDigits.length < 10) {
      novosErros.telefone = 'Informe um WhatsApp ou telefone válido com DDD.'
    }

    if (tipoEntrega === 'delivery') {
      if (!rua.trim()) novosErros.rua = 'Informe a rua ou logradouro.'
      if (!numero.trim()) novosErros.numero = 'Informe o número.'
      if (!bairro.trim()) novosErros.bairro = 'Informe o bairro.'
    }

    if (formaPagamento === 'dinheiro' && precisaTroco) {
      const trocoNum = Number(trocoPara.replace(',', '.'))
      if (isNaN(trocoNum) || trocoNum < total) {
        novosErros.trocoPara = `O valor do troco deve ser maior ou igual a ${formatBRL(total)}.`
      }
    }

    setErros(novosErros)
    return Object.keys(novosErros).length === 0
  }

  // ── Envio do Formulário para o Supabase ────────────────────────────────────
  async function handleSubmitPedido(e) {
    if (e) e.preventDefault()

    if (!validarFormulario()) {
      handleVibrate([50, 50, 50])
      return
    }

    setEnviando(true)
    handleVibrate(40)

    // Formatação estruturada do endereço e dados do pedido
    let enderecoFormatado = ''
    if (tipoEntrega === 'delivery') {
      enderecoFormatado = `${rua.trim()}, Nº ${numero.trim()} - ${bairro.trim()}`
      if (complemento.trim()) enderecoFormatado += ` (${complemento.trim()})`
      if (cep.trim()) enderecoFormatado += ` - CEP: ${cep.trim()}`
      if (pontoReferencia.trim()) enderecoFormatado += ` [Ref: ${pontoReferencia.trim()}]`
    } else {
      enderecoFormatado = 'Retirada no Balcão da Pizzaria'
    }

    // Inclusão de telefone, forma de pagamento e observações no registro
    const formaPagtoTexto = {
      pix: 'PIX (Chave enviada)',
      cartao_credito: 'Cartão de Crédito (Máquina)',
      cartao_debito: 'Cartão de Débito (Máquina)',
      dinheiro: precisaTroco ? `Dinheiro (Troco para ${formatBRL(trocoPara)})` : 'Dinheiro (Sem troco)',
    }[formaPagamento]

    const enderecoComDetalhes = `${enderecoFormatado} | Tel: ${telefone.trim()} | Pagamento: ${formaPagtoTexto}${
      observacoes.trim() ? ` | Obs: ${observacoes.trim()}` : ''
    }`

    // Mapeamento dos itens no formato aceito pelo Supabase
    const itensFormatados = carrinho.map(item => ({
      id: item.id,
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade,
      detalhes: item.detalhes || null,
      observacao: item.observacao || null,
    }))

    const { data, error } = await supabase
      .from('pedidos')
      .insert({
        cliente_nome: nome.trim(),
        cliente_endereco: enderecoComDetalhes,
        itens: itensFormatados,
        total: total,
        status: 'Pendente',
      })
      .select()

    if (error) {
      console.error('Erro ao enviar pedido para o Supabase:', error)
      alert('Ops! Ocorreu um erro ao enviar seu pedido para a cozinha: ' + error.message)
      setEnviando(false)
      return
    }

    const pedidoSalvo = data && data[0] ? data[0] : { id: Math.floor(Math.random() * 9000 + 1000) }

    // Salvar histórico do pedido no localStorage para rastreamento
    try {
      const historicoAtual = JSON.parse(localStorage.getItem('haruy_pedidos_historico') || '[]')
      const novoHistorico = [
        {
          id: pedidoSalvo.id,
          data: new Date().toISOString(),
          cliente: nome.trim(),
          total: total,
          tipoEntrega,
          status: 'Pendente',
        },
        ...historicoAtual,
      ].slice(0, 10)
      localStorage.setItem('haruy_pedidos_historico', JSON.stringify(novoHistorico))
    } catch {
      // Ignora erro de localStorage
    }

    setRecibo({
      id: pedidoSalvo.id,
      cliente: nome.trim(),
      telefone: telefone.trim(),
      tipoEntrega,
      endereco: enderecoFormatado,
      pagamento: formaPagtoTexto,
      total,
      itens: itensFormatados,
    })

    setEnviando(false)
    if (mostrarToast) mostrarToast('Pedido enviado para a cozinha com sucesso! 🍕', 'sucesso')
    if (onPedidoConcluido) onPedidoConcluido()
    handleVibrate([100, 50, 100])
  }

  // ── Renderização do Recibo de Sucesso do Pedido ────────────────────────────
  if (recibo) {
    return (
      <div className="fixed inset-0 bg-black/75 z-[95] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
              ✓
            </div>
            <span className="text-xs font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-full">
              Pedido Confirmado!
            </span>
            <h2 className="text-2xl font-black text-gray-900 mt-2">
              Pedido #{recibo.id}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Já foi enviado para nossa cozinha e fornos a lenha!
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2.5 text-xs text-gray-700 mb-5">
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Cliente:</span>
              <span className="font-bold text-gray-900">{recibo.cliente}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Contato:</span>
              <span className="font-bold text-gray-900">{recibo.telefone}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Modalidade:</span>
              <span className="font-bold text-gray-900 capitalize">
                {recibo.tipoEntrega === 'delivery' ? '🛵 Entrega' : '🏬 Retirada'}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-gray-200">
              <span className="text-gray-500">Pagamento:</span>
              <span className="font-bold text-gray-900">{recibo.pagamento}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold text-gray-700">Total Pago/A Pagar:</span>
              <span className="font-black text-base text-primary">{formatBRL(recibo.total)}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3 mb-6">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="text-xs font-bold text-amber-900">Tempo estimado:</p>
              <p className="text-[11px] text-amber-700">
                {recibo.tipoEntrega === 'delivery' ? '35 a 50 minutos para entrega' : '20 a 30 minutos para retirada'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleVibrate(30)
              setRecibo(null)
              onFechar()
            }}
            className="w-full bg-primary text-white py-3.5 rounded-2xl font-black text-sm hover:bg-red-700 active:scale-95 transition-all shadow-lg"
          >
            Concluir e Voltar ao Cardápio
          </button>
        </div>
      </div>
    )
  }

  // ── Renderização Principal do Formulário Móvel ─────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/70 z-[90] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 px-0 sm:px-4">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onFechar} />

      <div className="relative bg-white w-full sm:max-w-lg max-h-[94vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
        {/* Handle visual mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Etapa Final
            </span>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              Dados do Pedido & Entrega
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { handleVibrate(20); onFechar() }}
            className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-lg shadow-sm active:scale-95 transition-all border border-gray-200"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmitPedido} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
          {/* Seção 1: Dados do Cliente */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 text-primary rounded-full flex items-center justify-center text-[10px] font-black">
                1
              </span>
              Seus Dados para Contato
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Nome Completo <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => {
                    setNome(e.target.value)
                    if (erros.nome) setErros(prev => ({ ...prev, nome: null }))
                  }}
                  placeholder="Ex: João da Silva"
                  className={`w-full text-xs p-3 rounded-xl border outline-none transition-all ${
                    erros.nome ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
                {erros.nome && <p className="text-[11px] text-red-500 mt-1 font-semibold">{erros.nome}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  WhatsApp / Celular <span className="text-primary">*</span>
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={e => {
                    setTelefone(mascaraTelefone(e.target.value))
                    if (erros.telefone) setErros(prev => ({ ...prev, telefone: null }))
                  }}
                  placeholder="(15) 99999-9999"
                  maxLength={15}
                  className={`w-full text-xs p-3 rounded-xl border outline-none transition-all ${
                    erros.telefone ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary'
                  }`}
                />
                {erros.telefone && <p className="text-[11px] text-red-500 mt-1 font-semibold">{erros.telefone}</p>}
              </div>
            </div>
          </div>

          {/* Seção 2: Modalidade de Entrega */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 text-primary rounded-full flex items-center justify-center text-[10px] font-black">
                2
              </span>
              Como deseja receber?
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => { handleVibrate(20); setTipoEntrega('delivery') }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  tipoEntrega === 'delivery'
                    ? 'border-primary bg-red-50 ring-2 ring-primary text-primary font-bold shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🛵</span>
                <span className="text-xs">Entrega Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => { handleVibrate(20); setTipoEntrega('retirada') }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  tipoEntrega === 'retirada'
                    ? 'border-primary bg-red-50 ring-2 ring-primary text-primary font-bold shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🏬</span>
                <span className="text-xs">Retirar no Balcão</span>
              </button>
            </div>

            {/* Endereço de Entrega */}
            {tipoEntrega === 'delivery' ? (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-gray-600">
                    Endereço de Entrega
                  </span>
                  {/* Botão GPS */}
                  <button
                    type="button"
                    onClick={obterLocalizacaoGps}
                    disabled={buscandoGps}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-white border border-red-200 px-2.5 py-1 rounded-full shadow-sm hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <span>📍</span>
                    {buscandoGps ? 'Localizando...' : 'Usar GPS'}
                  </button>
                </div>

                {/* CEP com busca automática */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cep}
                      onChange={e => {
                        const v = mascaraCEP(e.target.value)
                        setCep(v)
                        if (v.replace(/\D/g, '').length === 8) consultarCep(v)
                      }}
                      placeholder="CEP (opcional, ex: 18010-000)"
                      maxLength={9}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white outline-none focus:border-primary"
                    />
                    {erros.cep && <p className="text-[10px] text-red-500 mt-0.5">{erros.cep}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => consultarCep(cep)}
                    disabled={buscandoCep}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {buscandoCep ? '...' : 'Buscar'}
                  </button>
                </div>

                {/* Rua e Número */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={rua}
                      onChange={e => {
                        setRua(e.target.value)
                        if (erros.rua) setErros(prev => ({ ...prev, rua: null }))
                      }}
                      placeholder="Rua / Avenida *"
                      className={`w-full text-xs p-2.5 rounded-xl border bg-white outline-none ${
                        erros.rua ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                      }`}
                    />
                    {erros.rua && <p className="text-[10px] text-red-500 mt-0.5">{erros.rua}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={numero}
                      onChange={e => {
                        setNumero(e.target.value)
                        if (erros.numero) setErros(prev => ({ ...prev, numero: null }))
                      }}
                      placeholder="Nº *"
                      className={`w-full text-xs p-2.5 rounded-xl border bg-white outline-none ${
                        erros.numero ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                      }`}
                    />
                    {erros.numero && <p className="text-[10px] text-red-500 mt-0.5">{erros.numero}</p>}
                  </div>
                </div>

                {/* Bairro e Complemento */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={bairro}
                      onChange={e => {
                        setBairro(e.target.value)
                        if (erros.bairro) setErros(prev => ({ ...prev, bairro: null }))
                      }}
                      placeholder="Bairro *"
                      className={`w-full text-xs p-2.5 rounded-xl border bg-white outline-none ${
                        erros.bairro ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                      }`}
                    />
                    {erros.bairro && <p className="text-[10px] text-red-500 mt-0.5">{erros.bairro}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={complemento}
                      onChange={e => setComplemento(e.target.value)}
                      placeholder="Apto, Bloco (opcional)"
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Ponto de Referência */}
                <input
                  type="text"
                  value={pontoReferencia}
                  onChange={e => setPontoReferencia(e.target.value)}
                  placeholder="Ponto de referência (ex: Próximo à padaria)"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white outline-none focus:border-primary"
                />
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                📍 <strong>Endereço para Retirada:</strong> Rua Prof. Toledo, 500 - Centro, Sorocaba. Seu pedido ficará pronto em cerca de 20 minutos após o envio!
              </div>
            )}
          </div>

          {/* Seção 3: Forma de Pagamento */}
          <div>
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 text-primary rounded-full flex items-center justify-center text-[10px] font-black">
                3
              </span>
              Forma de Pagamento
            </h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { id: 'pix', label: '⚡ PIX Instantâneo' },
                { id: 'cartao_credito', label: '💳 Cartão de Crédito' },
                { id: 'cartao_debito', label: '💳 Cartão de Débito' },
                { id: 'dinheiro', label: '💵 Dinheiro na Entrega' },
              ].map(opt => {
                const isSelected = formaPagamento === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => { handleVibrate(20); setFormaPagamento(opt.id) }}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-red-50 text-primary ring-1 ring-primary'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Opção de Troco para Dinheiro */}
            {formaPagamento === 'dinheiro' && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={precisaTroco}
                    onChange={e => setPrecisaTroco(e.target.checked)}
                    className="accent-primary"
                  />
                  Precisa de troco?
                </label>

                {precisaTroco && (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Troco para quanto? (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={trocoPara}
                      onChange={e => setTrocoPara(e.target.value)}
                      placeholder={`Ex: ${(total + 10).toFixed(2)}`}
                      className={`w-full text-xs p-2.5 rounded-xl border bg-white outline-none ${
                        erros.trocoPara ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                      }`}
                    />
                    {erros.trocoPara && (
                      <p className="text-[10px] text-red-500 mt-1 font-semibold">{erros.trocoPara}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 4: Observações Gerais */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Observações Gerais do Pedido
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Instruções para o entregador, interfone, etc..."
              className="w-full text-xs p-3 rounded-xl border border-gray-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </form>

        {/* Rodapé Fixo com Resumo e Botão de Enviar Pedido */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Itens no carrinho: {carrinho.reduce((a, b) => a + b.quantidade, 0)}</span>
            <div className="text-right">
              <span className="text-gray-500 mr-2">Total do Pedido:</span>
              <span className="text-lg font-black text-primary">{formatBRL(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitPedido}
            disabled={enviando}
            className={`w-full bg-gradient-to-r from-primary to-[#a82d2f] text-white py-4 rounded-2xl font-black text-base shadow-xl hover:brightness-105 active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${
              enviando ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {enviando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Enviando Pedido à Cozinha...</span>
              </>
            ) : (
              <>
                <span>Enviar Pedido para a Cozinha</span>
                <span>🍕</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
