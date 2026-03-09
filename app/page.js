'use client'

import { useState, useEffect } from 'react'

// Data User
const users = [
  { id: 'tyo', name: 'Tyo', image: 'tyo.jpg' },
  { id: 'el', name: 'El', image: 'el.jpeg' },
]

const categories = ['Food', 'Transport', 'Groceries', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other']
const paymentMethods = ['Cash', 'BCA', 'Livin']

const getTodayDate = () => new Date().toISOString().split('T')[0]

// ==========================================
// RUMUS BARU 1: Pengecek Tanggal Super Pintar
// ==========================================
const isCurrentMonth = (dateString) => {
  if (!dateString) return false

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Coba ubah string jadi tanggal menggunakan bawaan JavaScript
  // Ini langsung mengenali format US dari Google Sheets (misal: 3/9/2026 menjadi March 9)
  let itemDate = new Date(dateString)

  // Jika gagal (misal karena format aneh), kita urai manual
  if (isNaN(itemDate.getTime()) && dateString.includes('/')) {
    const parts = dateString.split('/')
    if (parts.length === 3) {
      // Paksa ke format YYYY-MM-DD
      itemDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`)
    }
  }

  if (isNaN(itemDate.getTime())) return false

  return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
}

// ==========================================
// RUMUS BARU 2: Pembersih Angka Nominal
// ==========================================
// Mencegah error jika Google Sheets menambahkan titik/koma pada angka
const safeParseFloat = (val) => {
  if (!val) return 0
  const cleanStr = String(val).replace(/[^0-9]/g, '') // Hapus semua kecuali angka murni
  return parseFloat(cleanStr) || 0
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('input')
  const [loading, setLoading] = useState(false)
  const [riwayat, setRiwayat] = useState([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')

  const [totalBulanIni, setTotalBulanIni] = useState(0)
  const [totalSemua, setTotalSemua] = useState(0)

  const [formData, setFormData] = useState({
    tanggal: getTodayDate(),
    nominal: '',
    item: '',
    kategori: 'Food',
    payment_method: 'Cash',
    paid_from: 'tyo',
    keterangan: '',
  })

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka).replace('Rp', 'IDR ')
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const hitungTotal = (data) => {
    let totalBulan = 0
    let totalAll = 0

    data.forEach((item) => {
      const nom = safeParseFloat(item.nominal)
      totalAll += nom

      // Menggunakan rumus baru untuk mengecek tanggal
      if (isCurrentMonth(item.tanggal)) {
        totalBulan += nom
      }
    })

    setTotalBulanIni(totalBulan)
    setTotalSemua(totalAll)
  }

  const fetchRiwayat = async () => {
    setLoadingRiwayat(true)
    try {
      const response = await fetch('/api/transaksi')
      if (response.ok) {
        const data = await response.json()
        setRiwayat(data)
        hitungTotal(data)
      }
    } catch (error) {
      console.error('Gagal mengambil riwayat', error)
    } finally {
      setLoadingRiwayat(false)
    }
  }

  useEffect(() => {
    fetchRiwayat()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('Expense saved!')
        setFormData({ ...formData, nominal: '', item: '', keterangan: '' })
        fetchRiwayat()
      } else {
        alert('Failed to save data.')
      }
    } catch (error) {
      alert('Network error.')
    } finally {
      setLoading(false)
    }
  }

  // Kalkulasi total filter menggunakan pembersih angka dan rumus bulan yang baru
  const filteredRiwayat = riwayat.filter((item) => activeFilter === 'All' || item.paid_from.toLowerCase() === activeFilter.toLowerCase())
  const totalFilteredBulanIni = filteredRiwayat.filter((item) => isCurrentMonth(item.tanggal)).reduce((sum, item) => sum + safeParseFloat(item.nominal), 0)

  return (
    <main suppressHydrationWarning className="min-h-screen bg-gray-50 text-gray-800 pb-24 font-sans">
      <header className="p-4 flex justify-between items-center bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-blue-950">PinoCash</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
      </header>

      {/* VIEW 1: INPUT EXPENSE */}
      {activeTab === 'input' && (
        <div className="max-w-md mx-auto p-4 space-y-6">
          <div className="bg-gradient-to-br from-blue-950 to-blue-800 p-6 rounded-3xl shadow-lg text-white mt-2 mb-4">
            <p className="text-sm font-medium text-blue-200 mb-1">Total Expenses This Month</p>
            <h2 className="text-3xl font-extrabold mb-4">{formatRupiah(totalBulanIni)}</h2>
            <div className="border-t border-blue-700 pt-3">
              <p className="text-xs text-blue-300">
                Total All Time: <span className="font-semibold text-white">{formatRupiah(totalSemua)}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider text-center">Nominal (IDR)</label>
              <input type="number" name="nominal" required value={formData.nominal} onChange={handleChange} className="w-full text-center text-4xl font-extrabold text-blue-950 bg-transparent outline-none p-2" placeholder="0" />
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Item Name</label>
              <input
                type="text"
                name="item"
                required
                value={formData.item}
                onChange={handleChange}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-blue-950"
                placeholder="e.g., Nasi Padang"
              />
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Date</label>
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input type="date" name="tanggal" required value={formData.tanggal} onChange={handleChange} className="w-full bg-transparent outline-none text-sm font-semibold text-blue-950 cursor-pointer" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, kategori: cat })}
                    className={`relative flex items-center justify-center p-3 rounded-xl text-xs font-bold transition-all ${formData.kategori === cat ? 'bg-blue-950 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((pm, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, payment_method: pm })}
                    className={`flex items-center justify-center p-3 rounded-xl text-xs font-bold transition-all ${formData.payment_method === pm ? 'bg-blue-950 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Paid From</label>
              <div className="grid grid-cols-2 gap-4">
                {users.map((user, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFormData({ ...formData, paid_from: user.id })}
                    className={`flex flex-col items-center p-4 rounded-2xl transition-all border-2 ${formData.paid_from === user.id ? 'border-blue-950 bg-blue-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <img src={user.image} alt={user.name} className="w-14 h-14 rounded-full mb-2 shadow-sm" />
                    <span className={`text-sm font-bold ${formData.paid_from === user.id ? 'text-blue-950' : 'text-gray-600'}`}>{user.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-950 text-white font-extrabold text-lg py-4 rounded-3xl shadow-lg hover:bg-blue-900 transition-all disabled:bg-blue-200 mt-4">
              {loading ? 'SAVING...' : 'Save Expense'}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: RIWAYAT / RECENT EXPENSES */}
      {activeTab === 'riwayat' && (
        <div className="max-w-md mx-auto p-4">
          <div className="flex justify-around gap-2 p-1 bg-white rounded-full border border-gray-100 shadow-sm mb-4 mt-2">
            {['All', 'Tyo', 'El'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-1 flex items-center justify-center p-2.5 rounded-full text-sm font-bold transition-all ${activeFilter === f ? 'bg-blue-950 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-3xl text-center border border-blue-100 shadow-sm">
            <p className="text-xs text-blue-700 font-bold mb-1 uppercase tracking-wider">Total {activeFilter === 'All' ? 'Keseluruhan' : activeFilter} Bulan Ini</p>
            <p className="text-2xl font-extrabold text-blue-950">{formatRupiah(totalFilteredBulanIni)}</p>
          </div>

          {loadingRiwayat ? (
            <div className="flex justify-center mt-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
            </div>
          ) : filteredRiwayat.length === 0 ? (
            <p className="text-center text-gray-500 mt-10 font-medium">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-4">
              {filteredRiwayat.map((item, index) => (
                <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xl font-extrabold text-blue-950">{formatRupiah(safeParseFloat(item.nominal))}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 mb-2 capitalize">{item.item}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-pink-100 text-pink-700 uppercase">{item.kategori}</span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 uppercase">{item.payment_method}</span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-green-100 text-green-700 uppercase">{item.paid_from}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-500 whitespace-nowrap">{item.tanggal}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAVIGATION FIXED */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button onClick={() => setActiveTab('input')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === 'input' ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[11px] font-bold tracking-wide">Record</span>
          </button>

          <button onClick={() => setActiveTab('riwayat')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === 'riwayat' ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[11px] font-bold tracking-wide">Recent</span>
          </button>
        </div>
      </div>
    </main>
  )
}
