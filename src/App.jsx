import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AdminPanel from './AdminPanel'
import ItemCustomizeModal from './components/ItemCustomizeModal'
import OrderFormModal from './components/OrderFormModal'
import FeedbackFormModal from './components/FeedbackFormModal'
import TrackOrderModal from './components/TrackOrderModal'
import MobileBottomNav from './components/MobileBottomNav'

// ─── Helper de formatação monetária ─────────────────────────────────────────
function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [adminAberto, setAdminAberto] = useState(false)

  // ── Modais de Formulários Móveis ─────────────────────────────────────────
  const [itemPersonalizar, setItemPersonalizar] = useState(null)
  const [personalizarAberto, setPersonalizarAberto] = useState(false)
  const [orderFormAberto, setOrderFormAberto] = useState(false)
  const [feedbackAberto, setFeedbackAberto] = useState(false)
  const [rastreioAberto, setRastreioAberto] = useState(false)

  // ── Toast de Feedback Global ─────────────────────────────────────────────
  const [toast, setToast] = useState({ mensagem: '', tipo: '' })

  function mostrarToast(mensagem, tipo = 'sucesso') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast({ mensagem: '', tipo: '' }), 3500)
  }

  // ── Estado do Cardápio ───────────────────────────────────────────────────
  const [categorias, setCategorias] = useState([])
  const [categoriaAtivaId, setCategoriaAtivaId] = useState(null)
  const [categoriaAtivaNome, setCategoriaAtivaNome] = useState('Carregando...')
  const [produtos, setProdutos] = useState([])
  const [carregandoCategorias, setCarregandoCategorias] = useState(true)
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)
  const [erroCategorias, setErroCategorias] = useState(null)
  const [erroProdutos, setErroProdutos] = useState(null)

  // ── Modal de detalhes simples do produto ─────────────────────────────────
  const [produtoDetalhe, setProdutoDetalhe] = useState(null)
  const [detalheAberto, setDetalheAberto] = useState(false)

  // ── Carrinho ─────────────────────────────────────────────────────────────
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem('haruy_carrinho')
    return salvo ? JSON.parse(salvo) : []
  })
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)

  // ── 1) Buscar categorias ao montar + real-time listener ──────────────────
  useEffect(() => {
    async function carregarCategorias() {
      setCarregandoCategorias(true)
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('criado_em', { ascending: true })

      if (error) {
        console.error('Erro ao carregar categorias:', error)
        setErroCategorias(error.message)
        setCarregandoCategorias(false)
        return
      }

      setCategorias(data || [])
      setCarregandoCategorias(false)

      if (data && data.length > 0) {
        setCategoriaAtivaId(data[0].id)
        setCategoriaAtivaNome(data[0].nome)
      }
    }

    carregarCategorias()

    const canal = supabase
      .channel('cardapio-categorias-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categorias' },
        () => carregarCategorias()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  // ── 2) Buscar produtos quando a categoria ativa mudar + real-time ────────
  useEffect(() => {
    if (!categoriaAtivaId) return

    async function carregarProdutos() {
      setCarregandoProdutos(true)
      setErroProdutos(null)
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('categoria_id', categoriaAtivaId)

      if (error) {
        console.error('Falha ao carregar produtos:', error)
        setErroProdutos(error.message)
        setProdutos([])
      } else {
        setProdutos(data || [])
      }
      setCarregandoProdutos(false)
    }

    carregarProdutos()

    const canal = supabase
      .channel(`cardapio-produtos-cat-${categoriaAtivaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos',
          filter: `categoria_id=eq.${categoriaAtivaId}`,
        },
        () => carregarProdutos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [categoriaAtivaId])

  // ── Persistir carrinho no localStorage ───────────────────────────────────
  useEffect(() => {
    localStorage.setItem('haruy_carrinho', JSON.stringify(carrinho))
  }, [carrinho])

  // ── Funções do cardápio e carrinho ────────────────────────────────────────
  function selecionarCategoria(id, nome) {
    if (navigator.vibrate) navigator.vibrate(20)
    setCategoriaAtivaId(id)
    setCategoriaAtivaNome(nome)
  }

  function abrirPersonalizacao(prod) {
    if (navigator.vibrate) navigator.vibrate(30)
    setItemPersonalizar(prod)
    setPersonalizarAberto(true)
  }

  function adicionarItemCustomizado(itemConfigurado) {
    setCarrinho(prev => {
      const idx = prev.findIndex(item => item.id === itemConfigurado.id)
      if (idx !== -1) {
        const copia = [...prev]
        copia[idx] = {
          ...copia[idx],
          quantidade: copia[idx].quantidade + itemConfigurado.quantidade,
        }
        return copia
      }
      return [...prev, itemConfigurado]
    })
    mostrarToast(`"${itemConfigurado.nome}" adicionado ao pedido! 🍕`)
  }

  function aumentarQuantidade(id) {
    if (navigator.vibrate) navigator.vibrate(30)
    setCarrinho(prev =>
      prev.map(item => (item.id === id ? { ...item, quantidade: item.quantidade + 1 } : item))
    )
  }

  function diminuirQuantidade(id) {
    if (navigator.vibrate) navigator.vibrate(30)
    setCarrinho(prev => {
      const idx = prev.findIndex(item => item.id === id)
      if (idx === -1) return prev
      if (prev[idx].quantidade > 1) {
        const copia = [...prev]
        copia[idx] = { ...copia[idx], quantidade: copia[idx].quantidade - 1 }
        return copia
      }
      const copia = prev.filter(item => item.id !== id)
      if (copia.length === 0) setCarrinhoAberto(false)
      return copia
    })
  }

  const total = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0)
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0)

  function abrirDetalhe(produto) {
    if (navigator.vibrate) navigator.vibrate(30)
    setProdutoDetalhe(produto)
    setDetalheAberto(true)
  }

  function fecharDetalhe() {
    setDetalheAberto(false)
  }

  function abrirFormularioPedido() {
    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio!')
      return
    }
    setCarrinhoAberto(false)
    setOrderFormAberto(true)
  }

  function handlePedidoConcluido() {
    setCarrinho([])
  }

  return (
    <>
      {/* ── Header ── */}
      <header className="w-full bg-white shadow-sm py-4 px-6 sticky top-0 z-40 border-b border-gray-100">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="max-w-[140px] md:max-w-[180px]">
            <a href="#" className="block">
              <img src="/assets/images/logopizza.png" alt="Goes Pizzaria" className="w-full" />
            </a>
          </h1>
          <nav className="hidden md:block">
            <ul className="flex items-center space-x-7 font-bold text-sm uppercase tracking-wider">
              <li>
                <a href="#cardapio" className="hover:text-primary transition-colors">Cardápio</a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setRastreioAberto(true)}
                  className="hover:text-primary transition-colors uppercase font-bold"
                >
                  🛵 Rastrear Pedido
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setFeedbackAberto(true)}
                  className="hover:text-primary transition-colors uppercase font-bold"
                >
                  ⭐ Avaliar
                </button>
              </li>
              <li>
                <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
              </li>
              {/* Botão Admin (desktop) */}
              <li>
                <button
                  onClick={() => setAdminAberto(true)}
                  className="text-gray-400 hover:text-primary transition-colors text-xs flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-full"
                  title="Painel Admin"
                >
                  ⚙️ Admin
                </button>
              </li>
            </ul>
          </nav>

          {/* Botão Carrinho Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setCarrinhoAberto(true)}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-700 active:scale-95 transition-all shadow-md relative"
            >
              <span>🛒 Meu Pedido</span>
              {totalItens > 0 && (
                <span className="bg-white text-primary rounded-full px-1.5 py-0.2 text-[11px] font-black">
                  {totalItens}
                </span>
              )}
            </button>
          </div>

          {/* Botão Menu Hamburger Mobile */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-[#333333] focus:outline-none p-2"
            aria-label="Abrir Menu"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Menu lateral mobile ── */}
      <div
        className="fixed top-0 w-[75%] max-w-sm h-full bg-white shadow-2xl transition-all duration-300 p-6 md:hidden z-[100] text-left"
        style={{ right: mobileMenuOpen ? '0' : '-100%' }}
      >
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <span className="font-black text-lg text-gray-900">Goes Pizzaria</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-lg"
          >
            &times;
          </button>
        </div>

        <ul className="flex flex-col gap-4 text-base font-bold uppercase tracking-wide">
          <li>
            <a
              href="#cardapio"
              className="block p-2 rounded-xl hover:bg-gray-100 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              🍕 Cardápio
            </a>
          </li>
          <li>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setRastreioAberto(true)
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-100 hover:text-primary transition-colors flex items-center gap-2"
            >
              <span>🛵</span> Rastrear Pedido
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setFeedbackAberto(true)
              }}
              className="w-full text-left p-2 rounded-xl hover:bg-gray-100 hover:text-primary transition-colors flex items-center gap-2"
            >
              <span>⭐</span> Avaliar Experiência
            </button>
          </li>
          <li>
            <a
              href="#contato"
              className="block p-2 rounded-xl hover:bg-gray-100 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              📞 Contato & Localização
            </a>
          </li>
          <li className="pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setAdminAberto(true)
                setMobileMenuOpen(false)
              }}
              className="w-full text-left p-2 rounded-xl bg-gray-100 hover:text-primary text-gray-700 flex items-center gap-2"
            >
              <span>⚙️</span> Painel Administrativo
            </button>
          </li>
        </ul>
      </div>

      <main className="pb-24 md:pb-12">
        {/* ── Hero Banner ── */}
        <section className="flex flex-col md:flex-row items-center justify-center text-center md:text-left px-6 py-10 md:py-16 max-w-7xl mx-auto gap-8">
          <div className="w-full md:w-1/2">
            <span className="text-xs font-black uppercase tracking-widest text-primary bg-red-50 px-3 py-1 rounded-full mb-3 inline-block">
              Forno a Lenha & Massa Artesanal
            </span>
            <p className="text-3xl md:text-5xl font-black leading-tight mb-4 text-gray-900">
              O verdadeiro sabor da autêntica pizza italiana
            </p>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              Peça direto pelo celular com entrega rápida em Sorocaba e Brigadeiro Tobias!
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a
                className="inline-block bg-primary text-white rounded-2xl px-6 py-3.5 text-base font-bold hover:bg-red-700 shadow-md active:scale-95 transition-all"
                href="#cardapio"
              >
                Fazer Pedido Agora 🍕
              </a>
              <button
                type="button"
                onClick={() => setRastreioAberto(true)}
                className="inline-block border-2 border-[#333333] rounded-2xl px-5 py-3 text-base font-bold hover:bg-[#333333] hover:text-white active:scale-95 transition-all"
              >
                Rastrear Pedido 🛵
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <img
              src="/assets/images/bannerpizza.png"
              alt="Pizzas artesanais deliciosas"
              className="w-[90%] max-w-[460px] drop-shadow-2xl"
            />
          </div>
        </section>

        {/* ── Cardápio Interativo ── */}
        <section
          className="container mx-auto max-w-[980px] mt-8 px-4 py-8 border-t border-dashed border-gray-300"
          id="cardapio"
        >
          <div className="text-center mb-8">
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Cardápio Completo
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-wide text-gray-900">
              Escolha seu Pedido
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Toque no item para escolher o tamanho, borda e personalizar os ingredientes!
            </p>
          </div>

          {/* Barra de Categorias Horizontal com rolagem touch */}
          <nav className="overflow-x-auto whitespace-nowrap snap-x flex gap-2 pb-2">
            {carregandoCategorias && (
              <div className="animate-pulse flex gap-2">
                <div className="h-9 w-24 bg-gray-200 rounded-full" />
                <div className="h-9 w-24 bg-gray-200 rounded-full" />
                <div className="h-9 w-24 bg-gray-200 rounded-full" />
              </div>
            )}
            {erroCategorias && <p className="text-red-500 text-xs">Erro ao carregar menu.</p>}
            {!carregandoCategorias && !erroCategorias && categorias.length === 0 && (
              <p className="text-gray-400 text-xs">Nenhuma categoria cadastrada.</p>
            )}
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => selecionarCategoria(cat.id, cat.nome)}
                className={`snap-start px-5 py-2 rounded-full font-bold text-xs transition-all duration-150 cursor-pointer flex-shrink-0 active:scale-95 shadow-sm ${
                  cat.id === categoriaAtivaId
                    ? 'bg-primary text-white shadow-red-200'
                    : 'bg-[#ebebeb] text-[#222222] hover:bg-gray-300'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </nav>

          {/* Grid de Produtos */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <div className="text-left text-dark font-extrabold text-xl">
                {categoriaAtivaNome}
              </div>
              <span className="text-xs text-gray-400 font-semibold">
                {produtos.length} opções disponíveis
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {carregandoProdutos && (
                <div className="col-span-full py-12 flex justify-center w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              )}
              {erroProdutos && !carregandoProdutos && (
                <p className="col-span-full text-red-500 text-center text-xs py-4">
                  Erro ao carregar produtos. Verifique sua conexão.
                </p>
              )}
              {!carregandoProdutos && !erroProdutos && produtos.length === 0 && (
                <div className="col-span-full bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                  <p className="text-gray-500 font-bold text-sm">
                    Nenhum produto cadastrado nesta categoria.
                  </p>
                </div>
              )}
              {!carregandoProdutos &&
                produtos.map(produto => (
                  <div
                    key={produto.id}
                    className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-gray-100 relative flex flex-col hover:shadow-md transition-shadow group text-left cursor-pointer"
                    onClick={() => abrirPersonalizacao(produto)}
                  >
                    {/* Botão de Ver Detalhes */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        abrirDetalhe(produto)
                      }}
                      className="absolute top-3 right-3 text-gray-300 hover:text-primary transition-colors z-10 p-1"
                      title="Ver detalhes"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </button>

                    {/* Imagem do Produto */}
                    <div className="w-full h-28 flex items-center justify-center mb-2 mt-1">
                      {produto.imagem ? (
                        <img
                          src={produto.imagem}
                          alt={produto.nome}
                          className="max-h-full max-w-full object-contain transition-transform duration-300 drop-shadow-sm group-hover:scale-105 pointer-events-none"
                          onError={e => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-4xl">🍕</span>
                      )}
                    </div>

                    <div className="w-full mt-auto pointer-events-none">
                      <h4 className="font-extrabold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-1">
                        {produto.nome}
                      </h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {produto.descricao || 'Receita tradicional'}
                      </p>
                      <p className="text-primary font-black text-base sm:text-lg leading-none mt-2">
                        {formatBRL(produto.preco)}
                      </p>
                    </div>

                    {/* Botão de Montar / Pedir */}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        abrirPersonalizacao(produto)
                      }}
                      className="w-full bg-primary text-white py-2 rounded-xl text-xs font-bold mt-3 shadow-md hover:bg-red-700 active:scale-95 transition-all z-10 flex items-center justify-center gap-1"
                    >
                      <span>Personalizar & Pedir</span>
                      <span>👉</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* ── Seção de Avaliações / Fale Conosco Banner ── */}
        <section className="container mx-auto max-w-[980px] mt-12 px-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-primary">
                Sua Opinião Importa
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                Gostou do nosso atendimento e sabor?
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-lg">
                Avalie nossa pizzaria ou envie uma sugestão em menos de 1 minuto pelo formulário móvel.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackAberto(true)}
              className="bg-primary text-white px-6 py-3.5 rounded-2xl font-black text-xs hover:bg-red-700 active:scale-95 transition-all shadow-md whitespace-nowrap"
            >
              ⭐ Deixar Minha Avaliação
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer id="contato" className="bg-[#333333] text-white p-8 sm:p-12 text-center">
        <h3 className="text-xl sm:text-2xl font-black mb-2">Goes Pizzaria</h3>
        <p className="text-xs text-gray-400 mb-4">Massa fresca, molho caseiro e ingredientes selecionados</p>
        <address className="not-italic text-xs text-gray-300 space-y-1.5">
          <p>📍 Rua Prof. Toledo, 500, Centro - Sorocaba / SP</p>
          <p>📞 WhatsApp: (15) 98765-4321</p>
        </address>
        <div className="flex justify-center gap-4 mt-6 text-xs text-gray-400 font-semibold">
          <button onClick={() => setRastreioAberto(true)} className="hover:text-white underline">
            Rastrear Pedido
          </button>
          <button onClick={() => setFeedbackAberto(true)} className="hover:text-white underline">
            Avaliar Pizzaria
          </button>
          <a href="/cozinha.html" className="hover:text-white underline">
            Painel da Cozinha
          </a>
        </div>
        <p className="mt-6 text-[11px] text-gray-500">
          Aberto todos os dias das 18h às 23h30
        </p>
      </footer>

      {/* ── Barra flutuante do carrinho (quando houver itens) ── */}
      <div
        onClick={() => setCarrinhoAberto(true)}
        className={`fixed bottom-14 md:bottom-0 left-0 w-full bg-primary text-white p-3.5 sm:p-4 z-40 shadow-[0_-4px_16px_rgba(202,60,63,0.3)] transform transition-transform duration-300 flex justify-between items-center cursor-pointer ${
          carrinho.length === 0 ? 'translate-y-full' : ''
        }`}
      >
        <div className="text-left">
          <p className="text-[11px] font-medium text-red-100">
            {totalItens} {totalItens === 1 ? 'item no carrinho' : 'itens no carrinho'}
          </p>
          <p className="text-base sm:text-lg font-black">Total: {formatBRL(total)}</p>
        </div>
        <button
          type="button"
          className="bg-white text-primary px-4 py-2 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
        >
          <span>Ver Carrinho & Finalizar</span>
          <span>👉</span>
        </button>
      </div>

      {/* ── Modal do Carrinho ── */}
      <div
        className={`fixed inset-0 bg-black/60 z-[70] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 ${
          carrinhoAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="fixed inset-0" onClick={() => setCarrinhoAberto(false)} />
        <div
          className={`bg-white w-full sm:w-[500px] h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col transform transition-transform duration-300 z-10 text-left ${
            carrinhoAberto ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:translate-y-0 sm:scale-95'
          }`}
        >
          <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gray-50">
            <div>
              <span className="text-[11px] font-black uppercase text-primary">Seu Pedido</span>
              <h2 className="text-lg font-black text-gray-900 leading-tight">
                Carrinho ({totalItens} itens)
              </h2>
            </div>
            <button
              onClick={() => setCarrinhoAberto(false)}
              className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-lg shadow-sm border border-gray-200"
            >
              &times;
            </button>
          </div>

          <div className="p-4 sm:p-5 flex-1 overflow-y-auto flex flex-col gap-3">
            {carrinho.map(item => (
              <div
                key={item.id}
                className="flex justify-between items-center border border-gray-100 bg-gray-50/60 p-3 rounded-2xl"
              >
                <div className="flex-1 pr-2">
                  <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">{item.nome}</h4>
                  {item.detalhes?.borda && (
                    <p className="text-[11px] text-gray-500">
                      Borda: <strong>{item.detalhes.borda}</strong>
                    </p>
                  )}
                  {item.observacao && (
                    <p className="text-[11px] text-primary italic font-medium">
                      Obs: {item.observacao}
                    </p>
                  )}
                  <p className="font-black text-xs text-primary mt-1">
                    {formatBRL(item.preco * item.quantidade)}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
                  <button
                    onClick={() => diminuirQuantidade(item.id)}
                    className="w-7 h-7 flex justify-center items-center rounded-lg font-black text-sm text-gray-700 hover:bg-gray-100 active:scale-95"
                  >
                    -
                  </button>
                  <span className="font-black text-xs w-4 text-center">{item.quantidade}</span>
                  <button
                    onClick={() => aumentarQuantidade(item.id)}
                    className="w-7 h-7 flex justify-center items-center rounded-lg font-black text-sm text-gray-700 hover:bg-gray-100 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 sm:p-5 border-t bg-gray-50 rounded-b-3xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-600">Subtotal:</span>
              <span className="text-xl font-black text-primary">{formatBRL(total)}</span>
            </div>

            <button
              onClick={abrirFormularioPedido}
              className="w-full bg-gradient-to-r from-primary to-[#a82d2f] text-white py-3.5 rounded-2xl text-sm font-black shadow-lg hover:brightness-105 active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              <span>Preencher Dados e Finalizar Pedido</span>
              <span>👉</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Detalhes Simples ── */}
      <div
        className={`fixed inset-0 bg-black/70 z-[80] flex justify-center items-center transition-opacity duration-300 px-4 ${
          detalheAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`bg-white w-full max-w-sm rounded-3xl overflow-hidden transform transition-transform duration-300 relative flex flex-col text-left ${
            detalheAberto ? 'scale-100' : 'scale-95'
          }`}
        >
          <button
            onClick={fecharDetalhe}
            className="absolute top-4 right-4 bg-white/80 backdrop-blur-md text-dark w-8 h-8 rounded-full flex justify-center items-center font-bold text-lg shadow-sm z-10 hover:text-primary active:scale-90 transition-all"
          >
            &times;
          </button>
          <div className="w-full h-52 bg-gray-50 flex justify-center items-center p-6 relative">
            <img
              src={produtoDetalhe?.imagem || ''}
              alt="Produto"
              className="w-full h-full object-contain drop-shadow-xl"
            />
          </div>
          <div className="p-5">
            <h2 className="text-xl font-black text-dark mb-1">{produtoDetalhe?.nome}</h2>
            <p className="text-lg font-black text-primary mb-3">
              {produtoDetalhe ? formatBRL(produtoDetalhe.preco) : 'R$ 0,00'}
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-gray-600 text-xs leading-relaxed">{produtoDetalhe?.descricao}</p>
            </div>
            <button
              onClick={() => {
                fecharDetalhe()
                if (produtoDetalhe) abrirPersonalizacao(produtoDetalhe)
              }}
              className="w-full bg-primary text-white py-3 rounded-xl text-xs font-black shadow-md hover:bg-red-700 active:scale-95 transition-all"
            >
              Personalizar e Pedir
            </button>
          </div>
        </div>
      </div>

      {/* ── Formulário Móvel 1: Personalização de Item ── */}
      <ItemCustomizeModal
        produto={itemPersonalizar}
        aberto={personalizarAberto}
        onFechar={() => setPersonalizarAberto(false)}
        onAdicionar={adicionarItemCustomizado}
      />

      {/* ── Formulário Móvel 2: Checkout & Entrada de Dados de Entrega ── */}
      <OrderFormModal
        carrinho={carrinho}
        total={total}
        aberto={orderFormAberto}
        onFechar={() => setOrderFormAberto(false)}
        onPedidoConcluido={handlePedidoConcluido}
        mostrarToast={mostrarToast}
      />

      {/* ── Formulário Móvel 3: Avaliação e Contato ── */}
      <FeedbackFormModal
        aberto={feedbackAberto}
        onFechar={() => setFeedbackAberto(false)}
        mostrarToast={mostrarToast}
      />

      {/* ── Formulário Móvel 4: Rastreamento de Pedido em Tempo Real ── */}
      <TrackOrderModal
        aberto={rastreioAberto}
        onFechar={() => setRastreioAberto(false)}
      />

      {/* ── Interface Móvel de Navegação Inferior (Estilo App Nativo) ── */}
      <MobileBottomNav
        totalItensCarrinho={totalItens}
        onAbrirCarrinho={() => setCarrinhoAberto(true)}
        onAbrirRastreio={() => setRastreioAberto(true)}
        onAbrirFeedback={() => setFeedbackAberto(true)}
        onAbrirAdmin={() => setAdminAberto(true)}
      />

      {/* ── Painel Admin (deslizante móvel) ── */}
      {adminAberto && <AdminPanel onFechar={() => setAdminAberto(false)} />}

      {/* ── Toast de Feedback ── */}
      {toast.mensagem && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 ${
            toast.tipo === 'erro' ? 'bg-red-600' : 'bg-green-600'
          } text-white px-5 py-2.5 rounded-full shadow-2xl font-bold text-xs z-[250] animate-in slide-in-from-top duration-200 flex items-center gap-2`}
        >
          <span>{toast.tipo === 'erro' ? '⚠️' : '✓'}</span>
          <span>{toast.mensagem}</span>
        </div>
      )}
    </>
  )
}
