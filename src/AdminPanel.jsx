import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Ícones SVG inline ───────────────────────────────────────────────────────
const IconEdit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4 1 1-4 12.362-12.726z" />
  </svg>
)

const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21A48.108 48.108 0 0016.5 6h-9a48.108 48.108 0 00-1.728.092M3 9h18M5.25 9l.75 11.25A2.25 2.25 0 008.25 22.5h7.5a2.25 2.25 0 002.25-2.25L18.75 9" />
  </svg>
)

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

// ─── Toast de feedback ───────────────────────────────────────────────────────
function Toast({ mensagem, tipo }) {
  if (!mensagem) return null
  const cor = tipo === 'erro' ? 'bg-red-500' : 'bg-green-600'
  return (
    <div className={`fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 ${cor} text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm z-[220] animate-bounce`}>
      {mensagem}
    </div>
  )
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────
function ModalConfirm({ aberto, mensagem, onConfirmar, onCancelar }) {
  if (!aberto) return null
  return (
    <div className="fixed inset-0 bg-black/60 z-[160] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <p className="text-base font-bold text-gray-800 mb-6 text-center">{mensagem}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-red-700 transition-all"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 1: GERENCIAR CATEGORIAS (Formulários de Entrada)
// ═══════════════════════════════════════════════════════════════════════════════
function GerenciarCategorias({ mostrarToast }) {
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  // Formulário de criação/edição
  const [formAberto, setFormAberto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [nomeForm, setNomeForm] = useState('')
  const [erroForm, setErroForm] = useState('')

  // Confirmação de exclusão
  const [confirmAberto, setConfirmAberto] = useState(false)
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState(null)

  async function carregarCategorias() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('criado_em', { ascending: true })

    if (error) {
      mostrarToast('Erro ao carregar categorias: ' + error.message, 'erro')
    } else {
      setCategorias(data || [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarCategorias()
  }, [])

  function abrirFormCriar() {
    setCategoriaEditando(null)
    setNomeForm('')
    setErroForm('')
    setFormAberto(true)
  }

  function abrirFormEditar(cat) {
    setCategoriaEditando(cat)
    setNomeForm(cat.nome)
    setErroForm('')
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setCategoriaEditando(null)
    setNomeForm('')
    setErroForm('')
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()
    if (!nomeForm.trim()) {
      setErroForm('O nome da categoria é obrigatório.')
      return
    }

    setEnviando(true)
    if (categoriaEditando) {
      const { error } = await supabase
        .from('categorias')
        .update({ nome: nomeForm.trim() })
        .eq('id', categoriaEditando.id)

      if (error) {
        mostrarToast('Erro ao atualizar categoria: ' + error.message, 'erro')
      } else {
        mostrarToast('Categoria atualizada! ✅', 'sucesso')
        fecharForm()
        await carregarCategorias()
      }
    } else {
      const { error } = await supabase
        .from('categorias')
        .insert({ nome: nomeForm.trim() })

      if (error) {
        mostrarToast('Erro ao criar categoria: ' + error.message, 'erro')
      } else {
        mostrarToast('Categoria criada com sucesso! ✅', 'sucesso')
        fecharForm()
        await carregarCategorias()
      }
    }
    setEnviando(false)
  }

  function pedirConfirmacaoExclusao(cat) {
    setCategoriaParaExcluir(cat)
    setConfirmAberto(true)
  }

  async function excluirCategoria() {
    setConfirmAberto(false)
    const { error } = await supabase
      .from('categorias')
      .delete()
      .eq('id', categoriaParaExcluir.id)

    if (error) {
      mostrarToast('Erro ao excluir: ' + error.message, 'erro')
    } else {
      mostrarToast('Categoria excluída! 🗑️', 'sucesso')
      await carregarCategorias()
    }
    setCategoriaParaExcluir(null)
  }

  return (
    <section className="text-left">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">Categorias</h3>
          <p className="text-xs text-gray-400">Total: {categorias.length} cadastradas</p>
        </div>
        <button
          onClick={abrirFormCriar}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-sm"
        >
          <IconPlus /> Nova Categoria
        </button>
      </div>

      {carregando ? (
        <div className="py-8 text-center text-gray-400 text-xs">Carregando categorias...</div>
      ) : categorias.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs">
          Nenhuma categoria cadastrada ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {categorias.map(cat => (
            <li
              key={cat.id}
              className="flex justify-between items-center bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl hover:border-gray-300 transition-all"
            >
              <span className="font-bold text-xs text-gray-800">{cat.nome}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => abrirFormEditar(cat)}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-200 active:scale-95 transition-all"
                >
                  <IconEdit /> Editar
                </button>
                <button
                  onClick={() => pedirConfirmacaoExclusao(cat)}
                  className="flex items-center gap-1 bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-200 active:scale-95 transition-all"
                >
                  <IconTrash /> Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal Formulário Móvel */}
      {formAberto && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center px-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h4 className="text-lg font-black text-gray-800 mb-4">
              {categoriaEditando ? '✏️ Editar Categoria' : '➕ Nova Categoria'}
            </h4>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Nome da Categoria <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={nomeForm}
              onChange={e => {
                setNomeForm(e.target.value)
                setErroForm('')
              }}
              placeholder="Ex: Pizzas Tradicionais, Bebidas..."
              className={`w-full border rounded-xl px-3 py-2.5 mb-2 outline-none text-xs text-gray-800 ${
                erroForm ? 'border-red-500' : 'border-gray-300 focus:border-primary'
              }`}
              autoFocus
            />
            {erroForm && <p className="text-[11px] text-red-500 mb-3 font-semibold">{erroForm}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={fecharForm}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 disabled:opacity-50"
              >
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ModalConfirm
        aberto={confirmAberto}
        mensagem={`Deseja excluir a categoria "${categoriaParaExcluir?.nome}"?`}
        onConfirmar={excluirCategoria}
        onCancelar={() => { setConfirmAberto(false); setCategoriaParaExcluir(null) }}
      />
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 2: GERENCIAR PRODUTOS (Formulários de Entrada com Preview)
// ═══════════════════════════════════════════════════════════════════════════════
function GerenciarProdutos({ mostrarToast }) {
  const [categorias, setCategorias] = useState([])
  const [produtos, setProdutos] = useState([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [formAberto, setFormAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState(null)
  const [form, setForm] = useState({ nome: '', descricao: '', preco: '', imagem: '', categoria_id: '' })
  const [erros, setErros] = useState({})

  const [confirmAberto, setConfirmAberto] = useState(false)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null)

  useEffect(() => {
    async function buscarCategorias() {
      const { data } = await supabase
        .from('categorias')
        .select('*')
        .order('criado_em', { ascending: true })
      const lista = data || []
      setCategorias(lista)
      if (lista.length > 0) setCategoriaSelecionada(lista[0].id)
    }
    buscarCategorias()
  }, [])

  async function carregarProdutos(catId) {
    if (!catId) return
    setCarregando(true)
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('categoria_id', catId)
      .order('id', { ascending: true })

    if (error) {
      mostrarToast('Erro ao carregar produtos: ' + error.message, 'erro')
    } else {
      setProdutos(data || [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarProdutos(categoriaSelecionada)
  }, [categoriaSelecionada])

  function abrirFormCriar() {
    setProdutoEditando(null)
    setForm({
      nome: '',
      descricao: '',
      preco: '',
      imagem: '',
      categoria_id: categoriaSelecionada || (categorias[0]?.id || ''),
    })
    setErros({})
    setFormAberto(true)
  }

  function abrirFormEditar(prod) {
    setProdutoEditando(prod)
    setForm({
      nome: prod.nome || '',
      descricao: prod.descricao || '',
      preco: prod.preco?.toString() || '',
      imagem: prod.imagem || '',
      categoria_id: prod.categoria_id || categoriaSelecionada,
    })
    setErros({})
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setProdutoEditando(null)
    setErros({})
  }

  function validarForm() {
    const err = {}
    if (!form.nome.trim()) err.nome = 'Nome do produto é obrigatório.'
    if (!form.preco || isNaN(Number(form.preco)) || Number(form.preco) <= 0) {
      err.preco = 'Preço deve ser um número positivo maior que zero.'
    }
    if (!form.categoria_id) err.categoria_id = 'Selecione uma categoria.'
    setErros(err)
    return Object.keys(err).length === 0
  }

  async function handleSubmitProduto(e) {
    if (e) e.preventDefault()
    if (!validarForm()) return

    setEnviando(true)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco),
      imagem: form.imagem.trim(),
      categoria_id: Number(form.categoria_id),
    }

    if (produtoEditando) {
      const { error } = await supabase
        .from('produtos')
        .update(payload)
        .eq('id', produtoEditando.id)

      if (error) {
        mostrarToast('Erro ao atualizar produto: ' + error.message, 'erro')
      } else {
        mostrarToast('Produto atualizado com sucesso! ✅', 'sucesso')
        fecharForm()
        await carregarProdutos(categoriaSelecionada)
      }
    } else {
      const { error } = await supabase.from('produtos').insert(payload)
      if (error) {
        mostrarToast('Erro ao criar produto: ' + error.message, 'erro')
      } else {
        mostrarToast('Produto cadastrado com sucesso! ✅', 'sucesso')
        fecharForm()
        await carregarProdutos(categoriaSelecionada)
      }
    }
    setEnviando(false)
  }

  function pedirConfirmacaoExclusao(prod) {
    setProdutoParaExcluir(prod)
    setConfirmAberto(true)
  }

  async function excluirProduto() {
    setConfirmAberto(false)
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', produtoParaExcluir.id)

    if (error) {
      mostrarToast('Erro ao excluir produto: ' + error.message, 'erro')
    } else {
      mostrarToast('Produto excluído! 🗑️', 'sucesso')
      await carregarProdutos(categoriaSelecionada)
    }
    setProdutoParaExcluir(null)
  }

  return (
    <section className="text-left">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">Produtos</h3>
          <p className="text-xs text-gray-400">Total nesta categoria: {produtos.length}</p>
        </div>
        <button
          onClick={abrirFormCriar}
          disabled={!categoriaSelecionada}
          className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
        >
          <IconPlus /> Novo Produto
        </button>
      </div>

      {/* Seletor Móvel de Categoria */}
      <div className="mb-4">
        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">
          Filtrar por Categoria:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaSelecionada(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                cat.id === categoriaSelecionada
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="py-8 text-center text-gray-400 text-xs">Carregando produtos...</div>
      ) : produtos.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs">
          Nenhum produto cadastrado nesta categoria.
        </div>
      ) : (
        <ul className="space-y-2">
          {produtos.map(prod => (
            <li
              key={prod.id}
              className="flex justify-between items-center bg-gray-50 border border-gray-200 p-3 rounded-2xl gap-3 hover:border-gray-300 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {prod.imagem ? (
                  <img
                    src={prod.imagem}
                    alt={prod.nome}
                    className="w-12 h-12 object-contain rounded-xl bg-white p-1 border border-gray-200 flex-shrink-0"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                    🍕
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs text-gray-800 truncate">{prod.nome}</p>
                  <p className="text-primary font-black text-xs">{formatBRL(prod.preco)}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => abrirFormEditar(prod)}
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-200 active:scale-95"
                >
                  <IconEdit /> Editar
                </button>
                <button
                  onClick={() => pedirConfirmacaoExclusao(prod)}
                  className="flex items-center gap-1 bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-200 active:scale-95"
                >
                  <IconTrash /> Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Formulário Modal Móvel com Preview */}
      {formAberto && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center px-4 overflow-y-auto py-6">
          <form
            onSubmit={handleSubmitProduto}
            className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 my-auto text-left"
          >
            <h4 className="text-lg font-black text-gray-800 mb-4">
              {produtoEditando ? '✏️ Editar Produto' : '➕ Novo Produto'}
            </h4>

            {/* Categoria Select */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Categoria <span className="text-primary">*</span>
              </label>
              <select
                value={form.categoria_id}
                onChange={e => setForm(prev => ({ ...prev, categoria_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-primary bg-white"
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Nome */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Nome do Produto <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Pizza Quatro Queijos"
                className={`w-full border rounded-xl px-3 py-2 text-xs text-gray-800 outline-none ${
                  erros.nome ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                }`}
              />
              {erros.nome && <p className="text-[10px] text-red-500 mt-0.5">{erros.nome}</p>}
            </div>

            {/* Preço */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Preço Base (R$) <span className="text-primary">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={e => setForm(prev => ({ ...prev, preco: e.target.value }))}
                placeholder="Ex: 69.90"
                className={`w-full border rounded-xl px-3 py-2 text-xs text-gray-800 outline-none ${
                  erros.preco ? 'border-red-500' : 'border-gray-300 focus:border-primary'
                }`}
              />
              {erros.preco && <p className="text-[10px] text-red-500 mt-0.5">{erros.preco}</p>}
            </div>

            {/* Imagem URL com preview */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">
                URL da Imagem
              </label>
              <input
                type="url"
                value={form.imagem}
                onChange={e => setForm(prev => ({ ...prev, imagem: e.target.value }))}
                placeholder="https://exemplo.com/imagem.png"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-primary"
              />
              {form.imagem && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                  <img
                    src={form.imagem}
                    alt="Preview"
                    className="w-10 h-10 object-contain rounded-lg bg-white"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                  <span className="text-[10px] text-gray-500">Preview da Imagem</span>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 mb-1">Descrição</label>
              <textarea
                rows={2}
                value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ingredientes da pizza, molho especial..."
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-primary resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={fecharForm}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-red-700 disabled:opacity-50"
              >
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ModalConfirm
        aberto={confirmAberto}
        mensagem={`Deseja excluir o produto "${produtoParaExcluir?.nome}"?`}
        onConfirmar={excluirProduto}
        onCancelar={() => { setConfirmAberto(false); setProdutoParaExcluir(null) }}
      />
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEÇÃO 3: GERENCIAR PEDIDOS (Visualização e Atualização em Tempo Real)
// ═══════════════════════════════════════════════════════════════════════════════
function GerenciarPedidos({ mostrarToast }) {
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  async function carregarPedidos() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('id', { ascending: false })
      .limit(30)

    if (error) {
      mostrarToast('Erro ao carregar pedidos: ' + error.message, 'erro')
    } else {
      setPedidos(data || [])
    }
    setCarregando(false)
  }

  useEffect(() => {
    carregarPedidos()

    // Real-time listener para pedidos
    const canal = supabase
      .channel('admin-pedidos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          carregarPedidos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  async function atualizarStatus(pedidoId, novoStatus) {
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus })
      .eq('id', pedidoId)

    if (error) {
      mostrarToast('Erro ao atualizar status: ' + error.message, 'erro')
    } else {
      mostrarToast(`Pedido #${pedidoId} agora está "${novoStatus}"!`, 'sucesso')
      setPedidos(prev =>
        prev.map(p => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
      )
    }
  }

  const pedidosFiltrados = filtroStatus === 'Todos'
    ? pedidos
    : pedidos.filter(p => (p.status || 'Pendente').toLowerCase() === filtroStatus.toLowerCase())

  return (
    <section className="text-left">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-black text-gray-800 uppercase tracking-wide">Pedidos</h3>
          <p className="text-xs text-gray-400">Total: {pedidos.length} pedidos</p>
        </div>
        <button
          onClick={carregarPedidos}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl font-bold"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* Filtro móvel */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {['Todos', 'Pendente', 'Em Preparo', 'Pronto', 'Entregue'].map(st => (
          <button
            key={st}
            onClick={() => setFiltroStatus(st)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              filtroStatus === st
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="py-8 text-center text-gray-400 text-xs">Carregando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs">
          Nenhum pedido encontrado neste status.
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map(p => {
            let itensList = []
            try {
              itensList = typeof p.itens === 'string' ? JSON.parse(p.itens) : (p.itens || [])
            } catch {
              itensList = []
            }

            return (
              <div
                key={p.id}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 hover:border-gray-300 transition-all text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-black text-sm text-gray-900">Pedido #{p.id}</span>
                    <p className="text-gray-500 font-semibold">{p.cliente_nome}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                    p.status === 'Pronto'
                      ? 'bg-green-100 text-green-700'
                      : p.status === 'Em Preparo'
                      ? 'bg-blue-100 text-blue-700'
                      : p.status === 'Entregue'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {p.status || 'Pendente'}
                  </span>
                </div>

                <p className="text-gray-600 text-[11px] bg-white p-2 rounded-xl border border-gray-200">
                  📍 {p.cliente_endereco}
                </p>

                {itensList.length > 0 && (
                  <div className="py-1">
                    <p className="text-[10px] font-black uppercase text-gray-400">Itens:</p>
                    <ul className="space-y-0.5 mt-0.5">
                      {itensList.map((item, idx) => (
                        <li key={idx} className="text-gray-700 font-medium">
                          • {item.quantidade || 1}x {item.nome}
                          {item.detalhes?.borda && <span className="text-gray-400"> ({item.detalhes.borda})</span>}
                          {item.observacao && <span className="text-primary"> [Obs: {item.observacao}]</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-black text-primary text-sm">{formatBRL(p.total)}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => atualizarStatus(p.id, 'Em Preparo')}
                      className="px-2 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-[10px] font-bold"
                    >
                      🔥 Preparo
                    </button>
                    <button
                      onClick={() => atualizarStatus(p.id, 'Pronto')}
                      className="px-2 py-1 bg-green-100 text-green-800 hover:bg-green-200 rounded-lg text-[10px] font-bold"
                    >
                      ✓ Pronto
                    </button>
                    <button
                      onClick={() => atualizarStatus(p.id, 'Entregue')}
                      className="px-2 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-[10px] font-bold"
                    >
                      Entregue
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: AdminPanel
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPanel({ onFechar }) {
  const [aba, setAba] = useState('pedidos') // 'pedidos' | 'categorias' | 'produtos'
  const [toast, setToast] = useState({ mensagem: '', tipo: '' })

  function mostrarToast(mensagem, tipo = 'sucesso') {
    setToast({ mensagem, tipo })
    setTimeout(() => setToast({ mensagem: '', tipo: '' }), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex justify-end">
      {/* Overlay para fechar */}
      <div className="flex-1" onClick={onFechar} />

      {/* Painel lateral deslizante móvel */}
      <div className="bg-white w-full max-w-md h-full flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-primary to-[#a82d2f] text-white p-5 flex justify-between items-center flex-shrink-0 shadow-sm">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-red-200 font-black">
              Painel de Gestão
            </span>
            <h2 className="text-xl font-black">⚙️ Administração</h2>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xl hover:bg-white/30 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-200 flex-shrink-0 bg-gray-50">
          {[
            { id: 'pedidos', label: '📋 Pedidos' },
            { id: 'produtos', label: '🍕 Produtos' },
            { id: 'categorias', label: '📂 Categorias' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                aba === tab.id
                  ? 'text-primary border-b-2 border-primary bg-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {aba === 'pedidos' && <GerenciarPedidos mostrarToast={mostrarToast} />}
          {aba === 'categorias' && <GerenciarCategorias mostrarToast={mostrarToast} />}
          {aba === 'produtos' && <GerenciarProdutos mostrarToast={mostrarToast} />}
        </div>
      </div>

      <Toast mensagem={toast.mensagem} tipo={toast.tipo} />
    </div>
  )
}
