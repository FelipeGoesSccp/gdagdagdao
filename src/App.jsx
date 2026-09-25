import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const API_URL = 'https://aula-7-vercel-pizza.vercel.app/api'

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Cardápio
  const [categorias, setCategorias] = useState([])
  const [categoriaAtivaId, setCategoriaAtivaId] = useState(null)
  const [categoriaAtivaNome, setCategoriaAtivaNome] = useState('Carregando...')
  const [produtos, setProdutos] = useState([])
  const [carregandoCategorias, setCarregandoCategorias] = useState(true)
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)
  const [erroCategorias, setErroCategorias] = useState(null)
  const [erroProdutos, setErroProdutos] = useState(null)

  // Modal de detalhes
  const [produtoDetalhe, setProdutoDetalhe] = useState(null)
  const [detalheAberto, setDetalheAberto] = useState(false)

  // Carrinho
  const [carrinho, setCarrinho] = useState(() => {
    const salvo = localStorage.getItem('haruy_carrinho')
    return salvo ? JSON.parse(salvo) : []
  })
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteEndereco, setClienteEndereco] = useState('')
  const [enviandoPedido, setEnviandoPedido] = useState(false)

  // 1) Buscar categorias na nuvem ao montar o componente
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
  }, [])

  // 2) Buscar produtos toda vez que a categoria ativa mudar
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
  }, [categoriaAtivaId])

  // Persistir carrinho
  useEffect(() => {
    localStorage.setItem('haruy_carrinho', JSON.stringify(carrinho))
  }, [carrinho])

  function selecionarCategoria(id, nome) {
    setCategoriaAtivaId(id)
    setCategoriaAtivaNome(nome)
  }

  function adicionarItem(id, nome, preco) {
    if (navigator.vibrate) navigator.vibrate(200)
    setCarrinho(prev => {
      const idx = prev.findIndex(item => item.id === id)
      if (idx !== -1) {
        const copia = [...prev]
        copia[idx] = { ...copia[idx], quantidade: copia[idx].quantidade + 1 }
        return copia
      }
      return [...prev, { id, nome, preco, quantidade: 1 }]
    })
  }

  function aumentarQuantidade(id) {
    if (navigator.vibrate) navigator.vibrate(50)
    setCarrinho(prev => prev.map(item => item.id === id ? { ...item, quantidade: item.quantidade + 1 } : item))
  }

  function diminuirQuantidade(id) {
    if (navigator.vibrate) navigator.vibrate(50)
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

  function abrirDetalhe(produto) {
    if (navigator.vibrate) navigator.vibrate(40)
    setProdutoDetalhe(produto)
    setDetalheAberto(true)
  }

  function fecharDetalhe() {
    setDetalheAberto(false)
  }

  async function fecharPedido() {
    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio!')
      return
    }
    if (!clienteNome || !clienteEndereco) {
      alert('Por favor, preencha seu nome e endereço de entrega!')
      return
    }

    const payloadPedido = {
      cliente_nome: clienteNome,
      cliente_endereco: clienteEndereco,
      itens: carrinho,
      total,
    }

    setEnviandoPedido(true)
    try {
      const resposta = await fetch(`${API_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPedido),
      })
      if (!resposta.ok) throw new Error('Erro ao enviar pedido')

      alert('Pedido enviado com sucesso para a cozinha!')
      setClienteNome('')
      setClienteEndereco('')
      setCarrinho([])
      setCarrinhoAberto(false)
    } catch (erro) {
      console.error(erro)
      alert('Ops! Ocorreu um problema de conexão. Tente novamente.')
    } finally {
      setEnviandoPedido(false)
    }
  }

  return (
    <>
      <header className="w-full bg-white shadow-sm py-4 px-6 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="max-w-[150px] md:max-w-[200px]">
            <img src="/assets/images/logopizza.png" alt="Goes Pizzaria" className="w-full" />
          </h1>
          <nav className="hidden md:block">
            <ul className="flex space-x-8 font-bold text-sm uppercase tracking-wider">
              <li><a href="#cardapio" className="hover:text-primary transition-colors">Cardápio</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Sobre</a></li>
              <li><a href="#contato" className="hover:text-primary transition-colors">Contato</a></li>
            </ul>
          </nav>
          <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-[#333333] focus:outline-none p-2" aria-label="Abrir Menu">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className="fixed top-0 w-[70%] h-full bg-white shadow-lg transition-all duration-300 p-8 md:hidden z-[100]"
        style={{ right: mobileMenuOpen ? '0' : '-100%' }}
      >
        <button onClick={() => setMobileMenuOpen(false)} className="text-2xl mb-6 font-bold">✕</button>
        <ul className="flex flex-col gap-6 text-lg font-bold uppercase">
          <li><a href="#cardapio" className="hover:text-primary" onClick={() => setMobileMenuOpen(false)}>Cardápio</a></li>
          <li><a href="#" className="hover:text-primary">Sobre</a></li>
          <li><a href="#contato" className="hover:text-primary" onClick={() => setMobileMenuOpen(false)}>Contato</a></li>
        </ul>
      </div>

      <main>
        <section className="flex flex-col md:flex-row items-center justify-center text-center md:text-left px-6 py-12 md:py-20 max-w-7xl mx-auto gap-8">
          <div className="w-full md:w-1/2">
            <p className="text-3xl md:text-6xl font-semibold leading-tight mb-6">O verdadeiro sabor da cozinha italiana</p>
            <a className="inline-block border border-[#333333] rounded-2xl px-8 py-5 text-xl font-medium hover:bg-[#333333] hover:text-white transition-all" href="#cardapio">
              Veja nosso Cardápio
            </a>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <img src="/assets/images/bannerpizza.png" alt="Pizzas variadas" className="w-[90%] max-w-[500px]" />
          </div>
        </section>

        <section className="container mx-auto max-w-[980px] mt-24 px-4 py-12 border-t border-dashed border-gray-400" id="cardapio">
          <h2 className="text-center text-4xl font-bold mb-12 uppercase tracking-wide">Cardápio</h2>

          <nav className="overflow-x-auto whitespace-nowrap snap-x flex gap-2 mt-6 pb-1">
            {carregandoCategorias && (
              <div className="animate-pulse flex gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-20 bg-gray-200 rounded-full"></div>
              </div>
            )}
            {erroCategorias && <p className="text-red-500 text-sm">Erro ao carregar menu.</p>}
            {!carregandoCategorias && !erroCategorias && categorias.length === 0 && (
              <p className="text-gray-400 text-sm">Nenhuma categoria cadastrada.</p>
            )}
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => selecionarCategoria(cat.id, cat.nome)}
                className={`snap-start px-4 py-1 rounded-full font-bold text-sm transition-all duration-150 cursor-pointer flex-shrink-0 ${
                  cat.id === categoriaAtivaId ? 'bg-primary text-white' : 'bg-[#ebebeb] text-[#222222]'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </nav>

          <div className="mt-8">
            <div className="text-left text-dark font-extrabold text-[22px] mb-4">{categoriaAtivaNome}</div>
            <div className="grid grid-cols-2 gap-4">
              {carregandoProdutos && (
                <div className="col-span-2 py-10 flex justify-center w-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              {erroProdutos && !carregandoProdutos && (
                <p className="col-span-2 text-red-500 text-center text-sm py-4">Erro ao carregar produtos. Verifique o console (F12).</p>
              )}
              {!carregandoProdutos && !erroProdutos && produtos.length === 0 && (
                <p className="col-span-2 text-gray-500 font-bold text-center py-8">Nenhum produto cadastrado nesta categoria.</p>
              )}
              {!carregandoProdutos && produtos.map(produto => (
                <div key={produto.id} className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 relative flex flex-col hover:shadow-md transition-shadow group">
                  <div
                    className="absolute inset-0 z-0 cursor-pointer"
                    onClick={() => abrirDetalhe(produto)}
                  ></div>
                  <button className="absolute top-3 right-3 text-gray-300 hover:text-primary transition-colors z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                  <img
                    src={produto.imagem || ''}
                    alt={produto.nome}
                    className="w-full h-24 object-contain mb-2 mt-2 transition-transform duration-300 drop-shadow-sm group-hover:scale-105 pointer-events-none relative z-10"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className="text-left w-full mt-auto relative z-10 pointer-events-none">
                    <h4 className="font-bold text-dark text-sm leading-tight">{produto.nome}</h4>
                    <p className="text-primary font-black text-lg leading-none mt-1">{formatBRL(produto.preco)}</p>
                  </div>
                  <button
                    onClick={() => adicionarItem(produto.id, produto.nome, Number(produto.preco))}
                    className="w-full bg-primary text-white py-2 rounded-xl text-xs font-bold mt-3 shadow-md hover:bg-red-700 active:scale-95 transition-all z-10 relative"
                  >
                    Adicionar ao Pedido
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contato" className="mt-24 bg-[#333333] text-white p-12 text-center">
        <h3 className="text-2xl font-bold mb-4">Goes Pizzaria</h3>
        <address className="not-italic text-sm text-gray-300 space-y-2">
          <p>Rua Prof. Toledo, 500, Centro - Sorocaba</p>
          <p>Whatsapp: (15) 98765-4321</p>
        </address>
        <p className="mt-6"><small className="text-gray-400">Aberto todos os dias das 14h às 23h</small></p>
      </footer>

      <a href="https://wa.me/5515987654321" className="fixed bottom-5 right-5 z-50 transition-transform hover:scale-110" target="_blank" rel="noreferrer">
        <img src="/assets/images/whatsapp.png" alt="WhatsApp" className="h-14 w-14" />
      </a>

      {/* Modal de detalhes do produto */}
      <div className={`fixed inset-0 bg-black/70 z-[80] flex justify-center items-center transition-opacity duration-300 px-4 ${detalheAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white w-full max-w-[400px] rounded-[30px] overflow-hidden transform transition-transform duration-300 relative flex flex-col ${detalheAberto ? 'scale-100' : 'scale-95'}`}>
          <button onClick={fecharDetalhe} className="absolute top-4 right-4 bg-white/80 backdrop-blur-md text-dark w-10 h-10 rounded-full flex justify-center items-center font-bold text-2xl shadow-sm z-10 hover:text-primary active:scale-90 transition-all">&times;</button>
          <div className="w-full h-[280px] bg-gray-50 flex justify-center items-center p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-white opacity-50"></div>
            <img src={produtoDetalhe?.imagem || ''} alt="Produto" className="w-full h-full object-contain drop-shadow-xl relative z-10 transition-transform duration-500 hover:scale-105" />
          </div>
          <div className="p-6">
            <h2 className="text-3xl font-black text-dark mb-1 leading-tight tracking-tight">{produtoDetalhe?.nome}</h2>
            <p className="text-2xl font-black text-primary mb-4 drop-shadow-sm">{produtoDetalhe ? formatBRL(produtoDetalhe.preco) : 'R$ 0,00'}</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-600 text-sm leading-relaxed font-medium">{produtoDetalhe?.descricao}</p>
            </div>
            <button
              onClick={() => { if (produtoDetalhe) { adicionarItem(produtoDetalhe.id, produtoDetalhe.nome, Number(produtoDetalhe.preco)); fecharDetalhe() } }}
              className="w-full bg-gradient-to-r from-primary to-[#a82d2f] text-white py-4 rounded-xl text-[17px] font-extrabold shadow-[0_8px_20px_-6px_rgba(202,60,63,0.5)] hover:shadow-[0_8px_25px_-4px_rgba(202,60,63,0.6)] active:scale-[0.98] transition-all outline-none flex justify-center items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Adicionar ao Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Barra flutuante do carrinho */}
      <div
        onClick={() => setCarrinhoAberto(true)}
        className={`fixed bottom-0 left-0 w-full bg-primary text-white p-4 z-50 shadow-[0_-4px_6px_rgba(0,0,0,0.1)] transform transition-transform duration-300 flex justify-between items-center cursor-pointer ${carrinho.length === 0 ? 'translate-y-full' : ''}`}
      >
        <div>
          <p className="text-sm font-medium">Resumo do Pedido</p>
          <p className="text-xl font-bold">Total: <span>{formatBRL(total)}</span></p>
        </div>
        <button className="bg-white text-primary px-4 py-2 rounded-lg font-bold shadow-md active:scale-95 transition-all">
          Ver Carrinho
        </button>
      </div>

      {/* Modal do carrinho */}
      <div className={`fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 ${carrinhoAberto ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className={`bg-white w-full sm:w-[500px] h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-2xl flex flex-col transform transition-transform duration-300 ${carrinhoAberto ? 'translate-y-0 sm:scale-100' : 'translate-y-full sm:translate-y-0 sm:scale-95'}`}>
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="text-2xl font-bold text-dark">Seu Carrinho</h2>
            <button onClick={() => setCarrinhoAberto(false)} className="text-3xl font-bold text-muted hover:text-dark focus:outline-none">&times;</button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
            {carrinho.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b pb-4 mt-2">
                <div className="flex-1">
                  <h4 className="font-bold text-lg text-dark">{item.nome}</h4>
                  <p className="text-sm text-muted">{formatBRL(item.preco)}</p>
                  <p className="font-bold text-primary mt-1">{formatBRL(item.preco * item.quantidade)}</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-xl">
                  <button onClick={() => diminuirQuantidade(item.id)} className="w-8 h-8 flex justify-center items-center bg-white rounded-lg font-bold text-xl shadow-sm hover:text-primary active:scale-95 transition-all">-</button>
                  <span className="font-bold text-lg w-4 text-center">{item.quantidade}</span>
                  <button onClick={() => aumentarQuantidade(item.id)} className="w-8 h-8 flex justify-center items-center bg-white rounded-lg font-bold text-xl shadow-sm hover:text-primary active:scale-95 transition-all">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 border-t bg-gray-50 rounded-b-3xl sm:rounded-b-2xl">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Total do Pedido:</span>
              <span className="text-2xl font-black text-primary">{formatBRL(total)}</span>
            </div>
            <input
              type="text" placeholder="Seu Nome Completo" value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="w-full mb-3 p-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
            />
            <input
              type="text" placeholder="Endereço de Entrega (Rua, Número, Bairro)" value={clienteEndereco}
              onChange={(e) => setClienteEndereco(e.target.value)}
              className="w-full mb-4 p-3 border border-gray-300 rounded-lg outline-none focus:border-primary"
            />
            <button
              onClick={fecharPedido}
              disabled={enviandoPedido}
              className={`w-full bg-primary text-white py-3 rounded-xl text-lg font-bold shadow-lg hover:bg-red-700 active:scale-95 transition-all ${enviandoPedido ? 'opacity-50' : ''}`}
            >
              {enviandoPedido ? 'Enviando...' : 'Fechar Pedido (Usar GPS)'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
