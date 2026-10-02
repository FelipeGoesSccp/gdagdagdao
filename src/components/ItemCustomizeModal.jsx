import { useState, useEffect } from 'react'

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const TAMANHOS = [
  { id: 'Broto', nome: 'Broto (4 fatias)', multiplicador: 0.8 },
  { id: 'Média', nome: 'Média (6 fatias)', multiplicador: 1.0 },
  { id: 'Grande', nome: 'Grande (8 fatias)', multiplicador: 1.25 },
  { id: 'Família', nome: 'Família (12 fatias)', multiplicador: 1.5 },
]

const BORDAS = [
  { id: 'Sem Borda', nome: 'Tradicional (Sem Recheio)', preco: 0 },
  { id: 'Catupiry', nome: 'Borda de Catupiry Original', preco: 8.0 },
  { id: 'Cheddar', nome: 'Borda de Cheddar Cremoso', preco: 8.0 },
  { id: 'Chocolate', nome: 'Borda Doce de Chocolate', preco: 10.0 },
]

export default function ItemCustomizeModal({ produto, aberto, onFechar, onAdicionar }) {
  const [tamanho, setTamanho] = useState('Média')
  const [borda, setBorda] = useState('Sem Borda')
  const [observacao, setObservacao] = useState('')
  const [quantidade, setQuantidade] = useState(1)

  useEffect(() => {
    if (aberto) {
      setTamanho('Média')
      setBorda('Sem Borda')
      setObservacao('')
      setQuantidade(1)
    }
  }, [aberto, produto])

  if (!aberto || !produto) return null

  const isPizza = produto.nome?.toLowerCase().includes('pizza') ||
    produto.descricao?.toLowerCase().includes('mussarela') ||
    produto.descricao?.toLowerCase().includes('calabresa') ||
    produto.descricao?.toLowerCase().includes('fatias') ||
    true // Deixa opções habilitadas para itens customizáveis

  const tamanhoObj = TAMANHOS.find(t => t.id === tamanho) || TAMANHOS[1]
  const bordaObj = BORDAS.find(b => b.id === borda) || BORDAS[0]

  const precoBase = Number(produto.preco) || 0
  const precoCalculado = (precoBase * tamanhoObj.multiplicador) + bordaObj.preco
  const totalItem = precoCalculado * quantidade

  function handleVibrate(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  function handleConfirmar() {
    handleVibrate(50)
    const itemConfigurado = {
      id: `${produto.id}-${tamanho}-${borda}-${Date.now()}`,
      produtoId: produto.id,
      nome: `${produto.nome} (${tamanho})`,
      detalhes: {
        tamanho,
        borda: borda !== 'Sem Borda' ? borda : null,
        observacao: observacao.trim() || null,
      },
      observacao: observacao.trim() || undefined,
      preco: precoCalculado,
      quantidade,
      imagem: produto.imagem,
    }

    onAdicionar(itemConfigurado)
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[85] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 px-0 sm:px-4">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onFechar} />

      <div className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
        {/* Handle visual para mobile */}
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-start">
          <div className="flex gap-3 items-center">
            {produto.imagem && (
              <img
                src={produto.imagem}
                alt={produto.nome}
                className="w-14 h-14 object-contain rounded-xl bg-gray-50 p-1 border border-gray-200"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-red-50 px-2 py-0.5 rounded-full">
                Personalizar Item
              </span>
              <h3 className="font-extrabold text-lg text-gray-900 leading-snug mt-0.5">
                {produto.nome}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-1">{produto.descricao}</p>
            </div>
          </div>
          <button
            onClick={() => { handleVibrate(20); onFechar() }}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-lg active:scale-95 transition-all"
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. Escolha do Tamanho */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black uppercase text-gray-600 tracking-wider">
                1. Escolha o Tamanho <span className="text-primary">*</span>
              </label>
              <span className="text-[11px] font-semibold text-gray-400">Obrigatório</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TAMANHOS.map(tam => {
                const precoTam = precoBase * tam.multiplicador
                const isSelected = tamanho === tam.id
                return (
                  <button
                    key={tam.id}
                    type="button"
                    onClick={() => { handleVibrate(20); setTamanho(tam.id) }}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-red-50/70 shadow-sm ring-1 ring-primary'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                        {tam.id}
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1">{tam.nome.split('(')[1]?.replace(')', '') || ''}</span>
                    <span className="text-xs font-extrabold text-gray-900 mt-1">{formatBRL(precoTam)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Escolha da Borda */}
          {isPizza && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase text-gray-600 tracking-wider">
                  2. Borda Recheada
                </label>
                <span className="text-[11px] font-semibold text-gray-400">Opcional</span>
              </div>
              <div className="space-y-1.5">
                {BORDAS.map(b => {
                  const isSelected = borda === b.id
                  return (
                    <label
                      key={b.id}
                      onClick={() => handleVibrate(20)}
                      className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-red-50/50 ring-1 ring-primary'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="borda"
                          checked={isSelected}
                          onChange={() => setBorda(b.id)}
                          className="accent-primary"
                        />
                        <span className="text-xs font-bold text-gray-800">{b.nome}</span>
                      </div>
                      <span className="text-xs font-black text-gray-700">
                        {b.preco === 0 ? 'Grátis' : `+ ${formatBRL(b.preco)}`}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. Observações / Customização */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-black uppercase text-gray-600 tracking-wider">
                3. Observações ou Alterações
              </label>
              <span className="text-[11px] text-gray-400">{observacao.length}/140</span>
            </div>
            <textarea
              maxLength={140}
              rows={2}
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Sem cebola, massa bem crocante, tirar azeitonas..."
              className="w-full text-xs p-3 border border-gray-300 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
            />
          </div>
        </div>

        {/* Rodapé com controle de quantidade e botão adicionar */}
        <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
          {/* Seletor de Quantidade touch */}
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                handleVibrate(25)
                setQuantidade(q => Math.max(1, q - 1))
              }}
              disabled={quantidade <= 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-gray-700 hover:bg-gray-100 active:scale-95 disabled:opacity-30 transition-all text-base"
            >
              -
            </button>
            <span className="w-8 text-center font-black text-sm text-gray-900">{quantidade}</span>
            <button
              type="button"
              onClick={() => {
                handleVibrate(25)
                setQuantidade(q => q + 1)
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-gray-700 hover:bg-gray-100 active:scale-95 transition-all text-base"
            >
              +
            </button>
          </div>

          {/* Botão de Adicionar */}
          <button
            type="button"
            onClick={handleConfirmar}
            className="flex-1 bg-gradient-to-r from-primary to-[#a82d2f] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all flex justify-between items-center"
          >
            <span>Adicionar ao Pedido</span>
            <span className="bg-black/20 px-2.5 py-1 rounded-lg text-xs font-black">
              {formatBRL(totalItem)}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
