import { useState } from 'react'

function mascaraTelefone(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

const DESCRICOES_NOTA = {
  1: 'Poderia ser bem melhor 😞',
  2: 'Regular, precisa melhorar 😐',
  3: 'Bom, gostei 👍',
  4: 'Muito bom! Recomendo 😋',
  5: 'Excelente! Pizza perfeita! ⭐🍕',
}

export default function FeedbackFormModal({ aberto, onFechar, mostrarToast }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('avaliacao') // 'avaliacao' | 'elogio' | 'sugestao' | 'duvida'
  const [estrelas, setEstrelas] = useState(5)
  const [hoverEstrelas, setHoverEstrelas] = useState(0)
  const [mensagem, setMensagem] = useState('')
  const [erros, setErros] = useState({})
  const [enviado, setEnviado] = useState(false)

  if (!aberto) return null

  function handleVibrate(ms = 30) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  function validar() {
    const err = {}
    if (!nome.trim() || nome.trim().length < 2) {
      err.nome = 'Por favor, informe seu nome.'
    }
    if (!mensagem.trim() || mensagem.trim().length < 5) {
      err.mensagem = 'Por favor, escreva uma mensagem com pelo menos 5 caracteres.'
    }
    setErros(err)
    return Object.keys(err).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validar()) {
      handleVibrate([40, 40])
      return
    }

    handleVibrate(60)

    const novaAvaliacao = {
      id: Date.now(),
      data: new Date().toISOString(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      tipo,
      estrelas,
      mensagem: mensagem.trim(),
    }

    try {
      const salvas = JSON.parse(localStorage.getItem('haruy_avaliacoes') || '[]')
      localStorage.setItem('haruy_avaliacoes', JSON.stringify([novaAvaliacao, ...salvas]))
    } catch {
      // Ignora erro de localStorage
    }

    setEnviado(true)
    if (mostrarToast) mostrarToast('Obrigado pela sua mensagem! Avaliação enviada. 🌟', 'sucesso')
  }

  function handleReset() {
    setNome('')
    setTelefone('')
    setTipo('avaliacao')
    setEstrelas(5)
    setMensagem('')
    setErros({})
    setEnviado(false)
    onFechar()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[90] flex flex-col justify-end sm:justify-center items-center transition-opacity duration-300 px-0 sm:px-4">
      <div className="fixed inset-0" onClick={handleReset} />

      <div className="relative bg-white w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
        <div className="sm:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Fale Conosco
            </span>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              Avaliação & Contato
            </h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="w-8 h-8 rounded-full bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-lg shadow-sm border border-gray-200"
          >
            &times;
          </button>
        </div>

        {enviado ? (
          <div className="p-8 text-center my-auto">
            <div className="w-16 h-16 bg-red-50 text-primary rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              ❤️
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Muito Obrigado!</h3>
            <p className="text-xs text-gray-600 mb-6 max-w-xs mx-auto leading-relaxed">
              Sua avaliação e feedback foram recebidos com sucesso. A equipe da Goes Pizzaria agradece pelo seu carinho e preferência!
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-red-700 active:scale-95 transition-all shadow-md"
            >
              Fechar e Continuar Navegando
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-left">
            {/* Seletor de Tipo */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">
                Tipo de Mensagem
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'avaliacao', label: '⭐ Avaliação' },
                  { id: 'elogio', label: '👏 Elogio' },
                  { id: 'sugestao', label: '💡 Sugestão' },
                  { id: 'duvida', label: '❓ Dúvida' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { handleVibrate(20); setTipo(item.id) }}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all text-center ${
                      tipo === item.id
                        ? 'border-primary bg-red-50 text-primary ring-1 ring-primary'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Avaliação por Estrelas */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-center">
              <label className="block text-xs font-black uppercase text-amber-900 tracking-wider mb-2">
                Como você avalia a sua experiência?
              </label>
              <div className="flex justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map(star => {
                  const preenchida = (hoverEstrelas || estrelas) >= star
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverEstrelas(star)}
                      onMouseLeave={() => setHoverEstrelas(0)}
                      onClick={() => { handleVibrate(25); setEstrelas(star) }}
                      className="text-3xl sm:text-4xl transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                    >
                      {preenchida ? '⭐' : '☆'}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs font-bold text-amber-800 mt-2">
                {DESCRICOES_NOTA[hoverEstrelas || estrelas]}
              </p>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Seu Nome <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => {
                  setNome(e.target.value)
                  if (erros.nome) setErros(prev => ({ ...prev, nome: null }))
                }}
                placeholder="Ex: Maria Oliveira"
                className={`w-full text-xs p-3 rounded-xl border outline-none ${
                  erros.nome ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-primary'
                }`}
              />
              {erros.nome && <p className="text-[11px] text-red-500 mt-1 font-semibold">{erros.nome}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                WhatsApp / Telefone (opcional)
              </label>
              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(15) 99999-9999"
                maxLength={15}
                className="w-full text-xs p-3 rounded-xl border border-gray-300 outline-none focus:border-primary"
              />
            </div>

            {/* Mensagem */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Sua Mensagem ou Comentário <span className="text-primary">*</span>
              </label>
              <textarea
                rows={3}
                value={mensagem}
                onChange={e => {
                  setMensagem(e.target.value)
                  if (erros.mensagem) setErros(prev => ({ ...prev, mensagem: null }))
                }}
                placeholder="Conte o que achou da pizza, atendimento, entrega..."
                className={`w-full text-xs p-3 rounded-xl border outline-none resize-none ${
                  erros.mensagem ? 'border-red-500 bg-red-50/30' : 'border-gray-300 focus:border-primary'
                }`}
              />
              {erros.mensagem && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold">{erros.mensagem}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-[#a82d2f] text-white py-3.5 rounded-2xl font-black text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all mt-2"
            >
              Enviar Avaliação
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
