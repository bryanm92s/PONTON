import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  toN, cleanDate, cleanTime, phoneMatch, fmtPeso,
  totalPagado, totalRestante, pagoEstadoDe, dayBooked,
  estadoOpEfectivo, enrichReservas, buildMonthBooked, monthCells, nextReservaId, MAX_PAX,
} from './helpers.js'

describe('toN', () => {
  it('extrae dígitos de strings con caracteres no numéricos', () => {
    expect(toN('$1600000')).toBe(1600000)
    expect(toN(' 1500 ')).toBe(1500)
  })
  it('devuelve 0 para no-numéricos', () => {
    expect(toN('')).toBe(0)
    expect(toN('abc')).toBe(0)
    expect(toN(null)).toBe(0)
  })
})

describe('cleanDate / cleanTime', () => {
  it('cleanDate acepta YYYY-MM-DD literal', () => {
    expect(cleanDate('2026-09-01')).toBe('2026-09-01')
  })
  it('cleanDate normaliza strings parseables', () => {
    expect(cleanDate('9/1/2026')).toBe('2026-09-01')
  })
  it('cleanDate devuelve "" para entradas vacías o inválidas', () => {
    expect(cleanDate('')).toBe('')
    expect(cleanDate('xx')).toBe('')
  })
  it('cleanTime normaliza HH:MM', () => {
    expect(cleanTime('9:00')).toBe('09:00')
    expect(cleanTime('17:30')).toBe('17:30')
    expect(cleanTime('')).toBe('')
  })
})

describe('phoneMatch', () => {
  it('prioriza coincidencia por sufijo', () => {
    expect(phoneMatch('3001234567', '567')).toBe(true)
  })
  it('también acepta subcadena', () => {
    expect(phoneMatch('3001234567', '1234')).toBe(true)
  })
  it('falla con query vacío o no coincidente', () => {
    expect(phoneMatch('3001234567', '')).toBe(false)
    expect(phoneMatch('3001234567', '999')).toBe(false)
  })
})

describe('fmtPeso', () => {
  it('formatea con separador de miles colombiano', () => {
    expect(fmtPeso(1600000)).toBe('$1.600.000')
    expect(fmtPeso(0)).toBe('$0')
  })
})

describe('totalPagado / totalRestante / pagoEstadoDe', () => {
  const payments = [
    { id: 'p1', reservaId: 'RES-0001', monto: '100000', fecha: '2026-09-01' },
    { id: 'p2', reservaId: 'RES-0001', monto: '50000',  fecha: '2026-09-02' },
    { id: 'p3', reservaId: 'RES-0002', monto: '200000', fecha: '2026-09-03' },
  ]
  it('totalPagado suma abonos por reserva', () => {
    expect(totalPagado('RES-0001', payments)).toBe(150000)
    expect(totalPagado('RES-0002', payments)).toBe(200000)
    expect(totalPagado('RES-XXXX', payments)).toBe(0)
  })
  it('totalRestante nunca es negativo', () => {
    expect(totalRestante({ id: 'RES-0001', valor: 200000 }, payments)).toBe(50000)
    expect(totalRestante({ id: 'RES-0001', valor: 100000 }, payments)).toBe(0)
  })
  it('pagoEstadoDe clasifica en SIN_PAGO / PARCIAL / PAGADO', () => {
    expect(pagoEstadoDe({ id: 'RES-0001', valor: 200000 }, payments)).toBe('PARCIAL')
    expect(pagoEstadoDe({ id: 'RES-0001', valor: 150000 }, payments)).toBe('PAGADO')
    expect(pagoEstadoDe({ id: 'RES-0009', valor: 100000 }, [])).toBe('SIN_PAGO')
  })
})

describe('dayBooked', () => {
  const reservas = [
    { id: 'RES-0001', fecha: '2026-09-10' },
    { id: 'RES-0002', fecha: '2026-09-12' },
  ]
  it('detecta día ocupado', () => {
    expect(dayBooked(reservas, '2026-09-10')).toBe(true)
    expect(dayBooked(reservas, '2026-09-11')).toBe(false)
  })
  it('excludeId permite ignorar la propia reserva al editar', () => {
    expect(dayBooked(reservas, '2026-09-10', 'RES-0001')).toBe(false)
  })
})

describe('estadoOpEfectivo', () => {
  const payments = [{ id: 'p1', reservaId: 'RES-0001', monto: 50000, fecha: '2026-09-01' }]
  it('CONFIRMADA al primer abono', () => {
    expect(estadoOpEfectivo({ id: 'RES-0001', estadoOp: 'PENDIENTE', fecha: '2099-01-01', hora: '09:00' }, payments, new Date('2026-09-01'))).toBe('CONFIRMADA')
  })
  it('PENDIENTE sin abonos y fecha futura', () => {
    expect(estadoOpEfectivo({ id: 'RES-0002', estadoOp: 'PENDIENTE', fecha: '2099-01-01', hora: '09:00' }, [], new Date('2026-09-01'))).toBe('PENDIENTE')
  })
  it('EN_CURSO cuando llega la hora', () => {
    expect(estadoOpEfectivo({ id: 'RES-0003', estadoOp: 'PENDIENTE', fecha: '2026-09-01', hora: '00:00' }, [], new Date('2026-09-01T01:00:00'))).toBe('EN_CURSO')
  })
  it('respeta estados terminales (FINALIZADA, CANCELADA, EN_CURSO)', () => {
    const now = new Date('2026-09-01')
    expect(estadoOpEfectivo({ id: 'R1', estadoOp: 'FINALIZADA', fecha: '2026-09-01', hora: '09:00' }, [], now)).toBe('FINALIZADA')
    expect(estadoOpEfectivo({ id: 'R2', estadoOp: 'CANCELADA', fecha: '2026-09-01', hora: '09:00' }, [], now)).toBe('CANCELADA')
  })
})

describe('enrichReservas', () => {
  it('añade valor numérico, pagos, restante, pagoEstado y estadoOp', () => {
    const out = enrichReservas(
      [{ id: 'RES-0001', fecha: '2099-01-01', hora: '09:00', valor: '300000', estadoOp: 'PENDIENTE' }],
      [{ id: 'p1', reservaId: 'RES-0001', monto: '100000', fecha: '2099-01-01' }]
    )
    expect(out[0].valor).toBe(300000)
    expect(out[0].totalPagado).toBe(100000)
    expect(out[0].totalRestante).toBe(200000)
    expect(out[0].pagoEstado).toBe('PARCIAL')
    expect(out[0].estadoOp).toBe('CONFIRMADA')
  })
})

describe('buildMonthBooked / monthCells', () => {
  it('buildMonthBooked devuelve un mapa fecha→reserva del mes', () => {
    const map = buildMonthBooked(2026, 9, [
      { id: 'R1', fecha: '2026-09-05' },
      { id: 'R2', fecha: '2026-08-30' }, // mes anterior, no debe entrar
      { id: 'R3', fecha: '2026-09-20' },
    ])
    expect(Object.keys(map).sort()).toEqual(['2026-09-05', '2026-09-20'])
  })
  it('monthCells empieza en lunes', () => {
    // Septiembre 2026 empieza en martes (getDay = 2 → startDow = 1)
    const cells = monthCells(2026, 9)
    const firstDate = cells.find(c => c)
    expect(firstDate).toBe('2026-09-01')
    // 1 celda vacía antes
    expect(cells[0]).toBe(null)
  })
  it('monthCells incluye todos los días del mes', () => {
    const cells = monthCells(2026, 2) // febrero
    expect(cells.filter(Boolean).length).toBe(28)
  })
})

describe('nextReservaId', () => {
  it('genera correlativo RES-0001 si no hay reservas', () => {
    expect(nextReservaId([])).toBe('RES-0001')
  })
  it('incrementa el máximo encontrado', () => {
    expect(nextReservaId([{ id: 'RES-0007' }, { id: 'RES-0012' }, { id: 'RES-0003' }])).toBe('RES-0013')
  })
  it('ignora ids que no siguen el patrón', () => {
    expect(nextReservaId([{ id: 'otro' }, { id: 'RES-0004' }])).toBe('RES-0005')
  })
})

describe('MAX_PAX', () => {
  it('la capacidad del pontón es 12', () => {
    expect(MAX_PAX).toBe(12)
  })
})