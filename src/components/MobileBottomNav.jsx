export default function MobileBottomNav({
  totalItensCarrinho,
  onAbrirCarrinho,
  onAbrirRastreio,
  onAbrirFeedback,
  onAbrirAdmin,
}) {
  function handleVibrate(ms = 25) {
    if (navigator.vibrate) navigator.vibrate(ms)
  }

  function irParaCardapio() {
    handleVibrate(20)
    const el = document.getElementById('cardapio')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 px-2 py-1.5 flex justify-around items-center shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
      {/* 1. Cardápio */}
      <button
        type="button"
        onClick={irParaCardapio}
        className="flex flex-col items-center justify-center p-1.5 text-gray-600 hover:text-primary active:scale-90 transition-all flex-1"
      >
        <span className="text-xl">🍕</span>
        <span className="text-[10px] font-black uppercase mt-0.5 tracking-tighter">Cardápio</span>
      </button>

      {/* 2. Carrinho com Badge */}
      <button
        type="button"
        onClick={() => {
          handleVibrate(25)
          onAbrirCarrinho()
        }}
        className="flex flex-col items-center justify-center p-1.5 text-gray-600 hover:text-primary active:scale-90 transition-all flex-1 relative"
      >
        <div className="relative">
          <span className="text-xl">🛒</span>
          {totalItensCarrinho > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm animate-pulse">
              {totalItensCarrinho}
            </span>
          )}
        </div>
        <span className="text-[10px] font-black uppercase mt-0.5 tracking-tighter">Carrinho</span>
      </button>

      {/* 3. Rastrear Pedido */}
      <button
        type="button"
        onClick={() => {
          handleVibrate(25)
          onAbrirRastreio()
        }}
        className="flex flex-col items-center justify-center p-1.5 text-gray-600 hover:text-primary active:scale-90 transition-all flex-1"
      >
        <span className="text-xl">🛵</span>
        <span className="text-[10px] font-black uppercase mt-0.5 tracking-tighter">Rastrear</span>
      </button>

      {/* 4. Feedback / Avaliação */}
      <button
        type="button"
        onClick={() => {
          handleVibrate(25)
          onAbrirFeedback()
        }}
        className="flex flex-col items-center justify-center p-1.5 text-gray-600 hover:text-primary active:scale-90 transition-all flex-1"
      >
        <span className="text-xl">⭐</span>
        <span className="text-[10px] font-black uppercase mt-0.5 tracking-tighter">Avaliar</span>
      </button>

      {/* 5. Painel Admin */}
      <button
        type="button"
        onClick={() => {
          handleVibrate(25)
          onAbrirAdmin()
        }}
        className="flex flex-col items-center justify-center p-1.5 text-gray-600 hover:text-primary active:scale-90 transition-all flex-1"
      >
        <span className="text-xl">⚙️</span>
        <span className="text-[10px] font-black uppercase mt-0.5 tracking-tighter">Admin</span>
      </button>
    </nav>
  )
}
