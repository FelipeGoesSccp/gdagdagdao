import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function formatBRL(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_ETAPAS = [
  { id: 'Pendente', label: '1. Pedido Recebido', emoji: '📝', desc: 'Aguardando início na cozinha' },
  { id: 'Em Preparo', label: '2. No Forno & Montagem', emoji: '🔥', desc: 'Sua pizza está sendo assada com carinho' },
  { id: 'Pronto', label: '3. Pronto / Saiu para Entrega', emoji: '🛵', desc: 'Pronto no balcão ou a caminho do seu endereço' },
  { id: 'Entregue', label: '4. Pedido Concluído', emoji: '✅', desc: 'Bom apetite!' },
]

export default function TrackOrderModal({ aberto, onFechar }) {
  const [termo, setTermo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [pedido, setPedido] = useState(null)
  const [historicoLocal, setHistoricoLocal] = useState([])
  const [mensagemErro, setMensagemErro] = useState('')

  useEffect(() => {
    if (aberto) {
      try {
        const hist = JSON.parse(localStorage.getItem('haruy_pedidos_historico') || '[]')
        setHistoricoLocal(hist)
        if (hist.length > 0 && !pedido) {
          buscarPedidoPorId(hist[0].id)
        }
      } catch {
        // Ignora erro
      }
    }
  }, [aberto])

  if (!aberto) return null

  function handleVibrate(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  async function buscarPedidoPorId(idOuTermo) {
    if (!idOuTermo) return
    handleVibrate(25)
    setCarregando(true)
    setMensagemErro('')

    const isNum = !isNaN(Number(idOuTermo))
    let query = supabase.from('pedidos').select('*')

    if (isNum) {
      query = query.eq('id', Number(idOuTermo))
    } else {
      query = query.ilike('cliente_nome', `%${idOuTermo.trim()}%`)
    }

    const { data, error } = await query.order('id', { ascending: false }).limit(1)

    if (error) {
      setMensagemErro('Erro ao consultar pedido: ' + error.message)
      setPedido(null)
    } else if (!data || data.length === 0) {
      setMensagemErro('Nenhum pedido encontrado com esse número ou nome.')
      setPedido(null)
    } else {
      setPedido(data[0])
    }
    setCarregando(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!termo.trim()) return
    buscarPedidoPorId(termo.trim())
  }

  const statusAtual = pedido ? (pedido.status || 'Pendente') : null
  const etapaIndex = STATUS_ETAPAS.findIndex(e => e.id.toLowerCase() === (statusAtual || '').toLowerCase())

  return (
    <div className="fixed inset-0 bg-black/70 z-[90] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 px-0 sm:px-4">
      <div className="fixed inset-0" onClick={onFechar} />

      <div className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Tempo Real
            </span>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              Rastrear Meu Pedido
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-lg shadow-sm border border-gray-200"
          >
            &times;
          </button>
        </div>

        {/* Formulário de Busca e Conteúdo */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-left">
          {/* Formulário móvel de busca */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={termo}
              onChange={e => setTermo(e.target.value)}
              placeholder="Digite o número do pedido ou seu nome..."
              className="flex-1 text-xs p-3 rounded-xl border border-gray-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={carregando}
              className="bg-primary text-white px-4 py-3 rounded-xl text-xs font-black hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {carregando ? '...' : '🔍 Buscar'}
            </button>
          </form>

          {/* Histórico recente de pedidos em botões touch rápidos */}
          {historicoLocal.length > 0 && !pedido && (
            <div>
              <p className="text-[11px] font-bold uppercase text-gray-400 mb-2">
                Seus Pedidos Recentes neste Aparelho:
              </p>
              <div className="flex flex-wrap gap-2">
                {historicoLocal.slice(0, 3).map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => buscarPedidoPorId(h.id)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full font-bold border border-gray-200 active:scale-95 transition-all"
                  >
                    Pedido #{h.id} ({formatBRL(h.total)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagemErro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold text-center">
              {mensagemErro}
            </div>
          )}

          {/* Detalhes do Pedido e Timeline */}
          {pedido && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-black uppercase text-primary">
                      Status do Pedido
                    </span>
                    <h3 className="text-xl font-black text-gray-900">
                      Pedido #{pedido.id}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Cliente: <strong>{pedido.cliente_nome}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => buscarPedidoPorId(pedido.id)}
                    className="text-xs text-primary font-bold bg-white border border-red-200 px-2.5 py-1 rounded-full hover:bg-red-50"
                  >
                    🔄 Atualizar
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs">
                  <span className="text-gray-500">Valor Total:</span>
                  <span className="font-black text-primary">{formatBRL(pedido.total)}</span>
                </div>
              </div>

              {/* Linha do Tempo / Timeline Interativa */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-black uppercase text-gray-600 tracking-wider">
                  Acompanhamento da Cozinha
                </h4>

                <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {STATUS_ETAPAS.map((etapa, idx) => {
                    const isConcluida = etapaIndex >= idx
                    const isAtual = etapaIndex === idx || (etapaIndex === -1 && idx === 0)

                    return (
                      <div key={etapa.id} className="relative flex items-start gap-3 pl-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 z-10 transition-all ${
                            isAtual
                              ? 'border-primary bg-primary text-white animate-pulse'
                              : isConcluida
                              ? 'border-green-600 bg-green-500 text-white'
                              : 'border-gray-300 bg-white text-gray-400'
                          }`}
                        >
                          {isConcluida && !isAtual ? '✓' : etapa.emoji}
                        </div>
                        <div className="flex-1">
                          <p
                            className={`text-xs font-black ${
                              isAtual
                                ? 'text-primary'
                                : isConcluida
                                ? 'text-green-700'
                                : 'text-gray-400'
                            }`}
                          >
                            {etapa.label}
                          </p>
                          <p className="text-[11px] text-gray-500">{etapa.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
