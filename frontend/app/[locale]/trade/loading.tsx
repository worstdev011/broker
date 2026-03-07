import Image from 'next/image';

export default function TradeLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 bg-[#061230]">
      <Image src="/images/logo.png" alt="Comfortrade" width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 object-contain animate-pulse" />
      <span className="text-white/70 text-sm">Загрузка...</span>
    </div>
  );
}
