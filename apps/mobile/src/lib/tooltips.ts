export type TooltipContent = { title: string; body: string };
export type TooltipKey =
  | 'soc'
  | 'efc'
  | 'wltp'
  | 'realRange'
  | 'stressScore'
  | 'dcRatio'
  | 'confidence';

type TooltipMap = Record<TooltipKey, TooltipContent>;
type LocaleTooltips = { tr: TooltipMap; en: TooltipMap };

export const TOOLTIPS: LocaleTooltips = {
  tr: {
    soc: {
      title: 'SOC — Şarj Durumu',
      body:
        'State of Charge (SOC), pilinizin anlık doluluk yüzdesidir. ' +
        '%0 tamamen boş, %100 tam dolu anlamına gelir.\n\n' +
        'Günlük kullanımda %20–%80 arasında tutmak pil ömrünü uzatır. ' +
        'Uzun süre park edecekseniz %40–%60 arası idealdir.',
    },
    efc: {
      title: 'EFC — Eşdeğer Tam Döngü',
      body:
        'Equivalent Full Cycle (EFC), pilinizin kaç kez sıfırdan tamama ' +
        'şarj edildiğinin toplamıdır.\n\n' +
        'Her gün %30\'dan %80\'e şarj yaparsanız bu 0,5 EFC/gün sayılır. ' +
        'Çoğu EV bataryası 1.000–1.500 EFC sonrasında belirgin kapasite ' +
        'kaybı yaşar.\n\n' +
        'Örnek hesap: 225.000 km ÷ 450 km menzil ≈ 500 EFC.',
    },
    wltp: {
      title: 'WLTP Menzili',
      body:
        'WLTP (Worldwide Harmonised Light Vehicle Test Procedure), ' +
        'Avrupa\'nın standart menzil ölçüm yöntemidir.\n\n' +
        '20°C sıcaklık, klima kapalı, sabit laboratuvar koşullarında ölçülür. ' +
        'Gerçek hayatta şehir trafiği, kış soğuğu, klima ve yüksek hız ' +
        'bu değeri %70–85\'e düşürür.',
    },
    realRange: {
      title: 'Beklenen Gerçek Kullanım',
      body:
        'WLTP değerinin şehir trafiği, hava koşulları ve sürüş tarzına ' +
        'göre düzeltilmiş halidir.\n\n' +
        'Örnek: WLTP 623 km ise İstanbul kış koşullarında %72–88 çarpanıyla ' +
        '449–548 km aralığı beklenir. Bu aralık kullanım veriniz arttıkça ' +
        'daha kişiselleşir.',
    },
    stressScore: {
      title: 'Stres Skorlu Döngü',
      body:
        'Standart EFC\'nin aksine, hızlı şarj (DC), aşırı ısı veya derin ' +
        'deşarj gibi pil ömrünü daha fazla etkileyen olayları ağırlıklandırarak ' +
        'hesaplanan döngü sayısıdır.\n\n' +
        'Stres skoru EFC\'den belirgin yüksekse şarj alışkanlıkları bataryayı ' +
        'ortalamadan hızlı yaşlandırıyor olabilir.',
    },
    dcRatio: {
      title: 'DC Şarj Oranı',
      body:
        'Toplam şarj seanslarınızda DC (hızlı) şarj kullanım yüzdesidir.\n\n' +
        'DC şarj pratik olmakla birlikte, yüksek akım nedeniyle pil hücrelerine ' +
        'ek ısıl stres bindirir. Uzun vadeli batarya sağlığı için ' +
        '%30\'un altında tutmak önerilir.',
    },
    confidence: {
      title: 'Güven Endeksi',
      body:
        'Sistemin elindeki veri miktarına göre tahminlerin ne kadar güvenilir ' +
        'olduğunu gösterir.\n\n' +
        '%100\'e yaklaştıkça şarj, yolculuk ve servis kayıtlarınız sistem ' +
        'modelini daha doğru besliyor demektir. Daha fazla kayıt = daha kesin sonuç.',
    },
  },

  en: {
    soc: {
      title: 'SOC — State of Charge',
      body:
        'State of Charge (SOC) is the current charge level of your battery as a percentage. ' +
        '0% means fully depleted, 100% means fully charged.\n\n' +
        'Keeping it between 20–80% for daily use extends battery life. ' +
        'For long parking periods, 40–60% is ideal.',
    },
    efc: {
      title: 'EFC — Equivalent Full Cycle',
      body:
        'Equivalent Full Cycle (EFC) is the total number of times your battery ' +
        'has been charged from empty to full, cumulatively.\n\n' +
        'Charging from 30% to 80% counts as 0.5 EFC per session. ' +
        'Most EV batteries show noticeable capacity loss after 1,000–1,500 EFC.\n\n' +
        'Example: 225,000 km ÷ 450 km range ≈ 500 EFC.',
    },
    wltp: {
      title: 'WLTP Range',
      body:
        'WLTP (Worldwide Harmonised Light Vehicle Test Procedure) is the ' +
        'European standard for measuring vehicle range.\n\n' +
        'It is measured at 20°C, without air conditioning, under controlled ' +
        'laboratory conditions. Real-world city traffic, cold weather, AC use ' +
        'and high speeds reduce this figure to 70–85%.',
    },
    realRange: {
      title: 'Expected Real-World Range',
      body:
        'The WLTP figure adjusted for city traffic, weather conditions and ' +
        'driving style.\n\n' +
        'Example: if WLTP is 623 km, with a 72–88% multiplier for Istanbul ' +
        'winter conditions, the expected range is 449–548 km. ' +
        'This estimate becomes more personalised as your usage data grows.',
    },
    stressScore: {
      title: 'Stress-Adjusted Cycle Count',
      body:
        'Unlike standard EFC, this metric weights events that age the battery ' +
        'faster — such as DC fast charging, extreme heat or deep discharge.\n\n' +
        'If the stress score is noticeably higher than your EFC, your charging ' +
        'habits may be ageing the battery faster than average.',
    },
    dcRatio: {
      title: 'DC Charge Ratio',
      body:
        'The percentage of your total charge sessions that used DC (fast) charging.\n\n' +
        'While DC charging is convenient, the high current creates additional ' +
        'thermal stress on battery cells. Keeping this below 30% is recommended ' +
        'for long-term battery health.',
    },
    confidence: {
      title: 'Confidence Index',
      body:
        'Shows how reliable the system\'s estimates are, based on the amount of ' +
        'data available.\n\n' +
        'The closer to 100%, the more your charge, trip and service records are ' +
        'feeding the model accurately. More data = more precise results.',
    },
  },
};

export function getTooltip(key: TooltipKey, locale: 'tr' | 'en' = 'tr'): TooltipContent {
  return TOOLTIPS[locale]?.[key] ?? TOOLTIPS.tr[key];
}
