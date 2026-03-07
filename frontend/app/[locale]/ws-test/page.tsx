'use client';

import { useRef, useState } from 'react';

type InitMeta = {
  session_uid: string;
  time_mult: number;
  start_time: number;
  order: string[];
  mapping: Record<string, string>;
};

type PriceUpdate = {
  name: string;
  ask: number;
  bid: number;
  time: number;
};

export default function WsTestPage() {
  const wsRef = useRef<WebSocket | null>(null);

  const [pair, setPair] = useState('EURUSD');
  const [meta, setMeta] = useState<InitMeta | null>(null);
  const [price, setPrice] = useState<PriceUpdate | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  // Кеш обновлений до получения INIT
  const pendingUpdatesRef = useRef<string[]>([]);

  function log(msg: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((l) => [`[${timestamp}] ${msg}`, ...l].slice(0, 50));
  }

  function connect() {
    if (wsRef.current) {
      wsRef.current.close();
      setIsConnected(false);
    }

    // Очищаем кеш при новом подключении
    pendingUpdatesRef.current = [];
    setMeta(null);
    setPrice(null);

    log(`Connecting to xchangeapi.com for ${pair}...`);

    // ⚠️ ВАЖНО: В браузере WebSocket не поддерживает headers напрямую
    // API ключ нужно передавать через query параметр или первое сообщение
    // Попробуем через query параметр (если API поддерживает)
    const apiKey = '1qo4zRecPUTdgOod8u6ob14hSdVXOANH';
    const ws = new WebSocket(
      `wss://api.xchangeapi.com/websocket/live?api-key=${apiKey}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      log('✅ WebSocket connected');
      setIsConnected(true);
      
      // Отправляем подписку на пару
      const subscribeMessage = JSON.stringify({ pairs: [pair] });
      log(`Sending subscribe: ${subscribeMessage}`);
      ws.send(subscribeMessage);
    };

    ws.onmessage = (e) => {
      parseMessage(e.data);
    };

    ws.onerror = (error) => {
      log(`❌ WebSocket error: ${error}`);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      log(`🔌 WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
      setIsConnected(false);
    };
  }

  function disconnect() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
      log('Disconnected manually');
    }
  }

  function parseMessage(data: string) {
    if (!data || data.length === 0) {
      log('⚠️ Empty message received');
      return;
    }

    // Логируем raw данные для отладки (первые 200 символов)
    const rawPreview = data.length > 200 ? data.substring(0, 200) + '...' : data;
    log(`📨 Raw message (${data.length} bytes): ${rawPreview}`);

    const code = data[0];
    const payload = data.slice(1);

    // Code 0: Initial metadata
    if (code === '0') {
      try {
        log(`🔍 Parsing INIT (code 0), payload: ${payload.substring(0, 200)}`);
        const meta = JSON.parse(payload) as InitMeta;
        setMeta(meta);
        log(`✅ INIT received: session_uid=${meta.session_uid}, pairs=${meta.order.length}`);
        log(`   Mapping: ${JSON.stringify(meta.mapping)}`);
        log(`   Time mult: ${meta.time_mult}, Start time: ${meta.start_time}`);
        
        // Обрабатываем накопленные обновления
        if (pendingUpdatesRef.current.length > 0) {
          log(`📦 Processing ${pendingUpdatesRef.current.length} pending updates...`);
          const updates = [...pendingUpdatesRef.current];
          pendingUpdatesRef.current = [];
          updates.forEach(updateData => {
            parseUpdate(updateData, meta);
          });
        }
      } catch (error) {
        log(`❌ Failed to parse INIT: ${error}`);
        log(`   Payload: ${payload}`);
      }
      return;
    }

    // Code 1: Price update
    if (code === '1') {
      const currentMeta = meta;
      
      // Если INIT еще не получен, кешируем обновление
      if (!currentMeta) {
        pendingUpdatesRef.current.push(payload);
        log(`📦 Caching update (waiting for INIT), total cached: ${pendingUpdatesRef.current.length}`);
        return;
      }

      // Обрабатываем обновление
      parseUpdate(payload, currentMeta);
      return;
    }

    // Code 2: Ping (игнорируем)
    if (code === '2') {
      // Можно ответить pong если нужно
      return;
    }

    // Unknown code - попробуем распарсить как JSON (может быть INIT в другом формате)
    if (!code || code === '{' || code === '[') {
      try {
        log(`🔍 Trying to parse as JSON (no code or starts with ${code})`);
        const parsed = JSON.parse(data);
        log(`   Parsed keys: ${Object.keys(parsed).join(', ')}`);
        
        if (parsed.session_uid && parsed.order && parsed.mapping) {
          const meta = parsed as InitMeta;
          setMeta(meta);
          log(`✅ INIT received (alternative format): session_uid=${meta.session_uid}`);
          
          // Обрабатываем накопленные обновления
          if (pendingUpdatesRef.current.length > 0) {
            log(`📦 Processing ${pendingUpdatesRef.current.length} pending updates...`);
            const updates = [...pendingUpdatesRef.current];
            pendingUpdatesRef.current = [];
            updates.forEach(updateData => {
              parseUpdate(updateData, meta);
            });
          }
          return;
        }
      } catch (e) {
        log(`   Not valid JSON: ${e}`);
        // Не JSON, продолжаем
      }
    }

    // Unknown code
    log(`❓ Unknown message code: ${code}, payload: ${payload.substring(0, 100)}`);
  }

  function parseUpdate(payload: string, currentMeta: InitMeta) {
    try {
      const parts = payload.split('|');

      if (parts.length !== currentMeta.order.length) {
        log(`⚠️ Parts count mismatch: expected ${currentMeta.order.length}, got ${parts.length}`);
        return;
      }

      const obj: any = {};
      currentMeta.order.forEach((key, i) => {
        obj[key] = parts[i];
      });

      const name = currentMeta.mapping[obj.name];
      const ask = Number(obj.ask);
      const bid = Number(obj.bid);

      if (!name || isNaN(ask) || isNaN(bid)) {
        log(`⚠️ Invalid update data: name=${name}, ask=${ask}, bid=${bid}`);
        return;
      }

      const timestamp = currentMeta.start_time + Number(obj.time) / currentMeta.time_mult;

      const priceUpdate: PriceUpdate = {
        name,
        ask,
        bid,
        time: timestamp,
      };

      setPrice(priceUpdate);
      log(`💰 Update: ${name} Ask=${ask.toFixed(5)} Bid=${bid.toFixed(5)} Time=${new Date(timestamp * 1000).toISOString()}`);
    } catch (error) {
      log(`❌ Failed to parse update: ${error}`);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>🔌 WebSocket OTC / REAL Price Test</h1>
      
      <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ marginRight: 10 }}>Валютная пара:</label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            disabled={isConnected}
            style={{ padding: '5px 10px', fontSize: 14 }}
          >
            <option value="EURUSD">EURUSD</option>
            <option value="GBPUSD">GBPUSD</option>
            <option value="GBPCHF">GBPCHF</option>
            <option value="USDJPY">USDJPY</option>
            <option value="AUDUSD">AUDUSD</option>
            <option value="USDCAD">USDCAD</option>
            <option value="EURJPY">EURJPY</option>
            <option value="GBPJPY">GBPJPY</option>
          </select>
        </div>

        <div>
          {!isConnected ? (
            <button 
              onClick={connect} 
              style={{ 
                padding: '8px 16px', 
                fontSize: 14, 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: 'pointer' 
              }}
            >
              🔌 Подключиться
            </button>
          ) : (
            <button 
              onClick={disconnect} 
              style={{ 
                padding: '8px 16px', 
                fontSize: 14, 
                backgroundColor: '#f44336', 
                color: 'white', 
                border: 'none', 
                borderRadius: 4, 
                cursor: 'pointer' 
              }}
            >
              🔌 Отключиться
            </button>
          )}
          <span style={{ marginLeft: 15, color: isConnected ? '#4CAF50' : '#999' }}>
            {isConnected ? '● Подключено' : '○ Отключено'}
          </span>
        </div>
      </div>

      {meta && (
        <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>📋 Metadata (INIT)</h3>
          <div><b>Session UID:</b> {meta.session_uid}</div>
          <div><b>Time Multiplier:</b> {meta.time_mult}</div>
          <div><b>Start Time:</b> {new Date(meta.start_time * 1000).toISOString()}</div>
          <div><b>Order:</b> {meta.order.join(', ')}</div>
          <div><b>Mapping:</b> {JSON.stringify(meta.mapping, null, 2)}</div>
        </div>
      )}

      {price && (
        <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>💰 Текущая цена</h3>
          <div style={{ fontSize: 18, marginBottom: 10 }}>
            <b>Пара:</b> <span style={{ color: '#1976d2' }}>{price.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 30 }}>
            <div>
              <div style={{ fontSize: 14, color: '#666' }}>Ask (продажа)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f44336' }}>
                {price.ask.toFixed(5)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#666' }}>Bid (покупка)</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50' }}>
                {price.bid.toFixed(5)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#666' }}>Spread</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {(price.ask - price.bid).toFixed(5)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 14, color: '#666' }}>
            <b>Timestamp:</b> {new Date(price.time * 1000).toLocaleString()} ({price.time})
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>📝 Логи (последние 50 сообщений)</h3>
        <div style={{ 
          maxHeight: 400, 
          overflow: 'auto', 
          backgroundColor: '#1e1e1e', 
          color: '#d4d4d4', 
          padding: 15, 
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 12
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888' }}>Нет логов. Нажмите "Подключиться" для начала.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {log}
              </div>
            ))
          )}
        </div>
        {logs.length > 0 && (
          <button 
            onClick={() => setLogs([])} 
            style={{ 
              marginTop: 10, 
              padding: '5px 10px', 
              fontSize: 12, 
              backgroundColor: '#666', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: 'pointer' 
            }}
          >
            Очистить логи
          </button>
        )}
      </div>

      <div style={{ marginTop: 30, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8, fontSize: 12 }}>
        <div><b>⚠️ ВАЖНО:</b></div>
        <div>Это тестовая страница для проверки формата данных от xchangeapi.com.</div>
        <div>API ключ находится в коде только для локального теста.</div>
        <div>В продакшене ключ будет на backend, а не в frontend коде.</div>
      </div>
    </div>
  );
}
