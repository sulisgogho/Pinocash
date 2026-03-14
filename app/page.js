'use client'

import { useState, useEffect } from 'react'

// DATA USER DIUBAH KE TYO & EL
const users = [
  { id: 'tyo', name: 'Tyo', image: 'tyo.jpg' },
  { id: 'el', name: 'El', image: 'el.jpeg' },
]

const categories = ['Food', 'Transport', 'Groceries', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other']
const paymentMethods = ['Cash', 'BCA', 'Livin']

const getTodayDate = () => new Date().toISOString().split('T')[0]

const isCurrentMonth = (dateString) => {
  if (!dateString) return false
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  let itemDate = new Date(dateString)

  if (isNaN(itemDate.getTime()) && dateString.includes('/')) {
    const parts = dateString.split('/')
    if (parts.length === 3) itemDate = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`)
  }
  return !isNaN(itemDate.getTime()) && itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
}

const safeParseFloat = (val) => {
  if (!val) return 0
  const cleanStr = String(val).replace(/[^0-9]/g, '')
  return parseFloat(cleanStr) || 0
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('input')
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')

  const [riwayat, setRiwayat] = useState([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(true)
  const [totalBulanIni, setTotalBulanIni] = useState(0)
  const [totalSemua, setTotalSemua] = useState(0)

  const [wishlistData, setWishlistData] = useState([])
  const [loadingWishlist, setLoadingWishlist] = useState(true)

  // STATE NOTIFIKASI TOAST
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  // STATE MODAL KONFIRMASI HAPUS
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, type: null })

  // DEFAULT FORM PAID_FROM DISET KE TYO
  const [formData, setFormData] = useState({
    tanggal: getTodayDate(),
    nominal: '',
    item: '',
    kategori: 'Food',
    payment_method: 'Cash',
    paid_from: 'tyo',
    keterangan: '',
  })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000)
  }

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka).replace('Rp', 'IDR ')
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const hitungTotal = (data) => {
    let totalBulan = 0
    let totalAll = 0
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const nom = safeParseFloat(item.nominal)
        totalAll += nom
        if (isCurrentMonth(item.tanggal)) totalBulan += nom
      })
    }
    setTotalBulanIni(totalBulan)
    setTotalSemua(totalAll)
  }

  const fetchRiwayat = async () => {
    setLoadingRiwayat(true)
    try {
      const res = await fetch('/api/transaksi')
      if (res.ok) {
        const data = await res.json()
        setRiwayat(data)
        hitungTotal(data)
      }
    } catch (error) {
      console.error('Gagal mengambil riwayat')
    } finally {
      setLoadingRiwayat(false)
    }
  }

  const fetchWishlist = async () => {
    setLoadingWishlist(true)
    try {
      const res = await fetch('/api/transaksi?type=wishlist')
      if (res.ok) {
        const data = await res.json()
        setWishlistData(data)
      }
    } catch (error) {
      console.error('Gagal mengambil wishlist')
    } finally {
      setLoadingWishlist(false)
    }
  }

  useEffect(() => {
    fetchRiwayat()
    fetchWishlist()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/transaksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, isWishlist: activeTab === 'wishlist' }),
      })

      if (res.ok) {
        setFormData({ ...formData, nominal: '', item: '', keterangan: '' })
        if (activeTab === 'wishlist') {
          showToast('Wishlist berhasil ditambahkan! 🎯', 'success')
          fetchWishlist()
        } else {
          showToast('Pengeluaran berhasil dicatat! 💸', 'success')
          fetchRiwayat()
        }
      } else {
        showToast('Gagal menyimpan data.', 'error')
      }
    } catch (error) {
      showToast('Kesalahan jaringan.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const triggerDelete = (id, type) => {
    setConfirmDelete({ show: true, id, type })
  }

  const executeDelete = async () => {
    const { id, type } = confirmDelete
    setConfirmDelete({ show: false, id: null, type: null })

    try {
      showToast('Menghapus data...', 'loading')
      const res = await fetch(`/api/transaksi?id=${id}&type=${type}`, { method: 'DELETE' })

      if (res.ok) {
        showToast('Data berhasil dihapus! 🗑️', 'success')
        if (type === 'wishlist') fetchWishlist()
        else fetchRiwayat()
      } else {
        showToast('Gagal menghapus data', 'error')
      }
    } catch (error) {
      showToast('Kesalahan jaringan.', 'error')
    }
  }

  const handleCompleteWishlist = async (id) => {
    try {
      showToast('Memproses...', 'loading')
      const res = await fetch('/api/transaksi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Selesai' }),
      })

      if (res.ok) {
        showToast('Hore! Target tercapai! 🎉', 'success')
        fetchWishlist()
      } else {
        showToast('Gagal mengubah status', 'error')
      }
    } catch (error) {
      showToast('Kesalahan jaringan.', 'error')
    }
  }

  const filteredRiwayat = Array.isArray(riwayat) ? riwayat.filter((item) => activeFilter === 'All' || item.paid_from?.toLowerCase() === activeFilter.toLowerCase()) : []
  const totalFilteredBulanIni = filteredRiwayat.filter((item) => isCurrentMonth(item.tanggal)).reduce((sum, item) => sum + safeParseFloat(item.nominal), 0)

  return (
    <main suppressHydrationWarning className="min-h-screen bg-gray-50 text-gray-800 pb-24 font-sans relative">
      {toast.show && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-xl text-sm font-bold text-white
            ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'loading' ? 'bg-blue-500' : 'bg-green-600'}
          `}
          >
            {toast.message}
          </div>
        </div>
      )}

      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl scale-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-extrabold text-blue-950 mb-2">Hapus Data?</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Aksi ini tidak bisa dibatalkan lho.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete({ show: false, id: null, type: null })} className="flex-1 py-3.5 font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
                Batal
              </button>
              <button onClick={executeDelete} className="flex-1 py-3.5 font-bold text-white bg-red-500 rounded-2xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="p-4 flex justify-between items-center bg-white shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-blue-950">PinoCash</h1>
        <span className="text-sm font-semibold text-gray-600">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {activeTab === 'input' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-blue-950 to-blue-800 p-6 rounded-3xl shadow-lg text-white mt-2">
              <p className="text-sm font-medium text-blue-200 mb-1">Total Expenses This Month</p>
              <h2 className="text-3xl font-extrabold mb-4">{formatRupiah(totalBulanIni)}</h2>
              <div className="border-t border-blue-700 pt-3">
                <p className="text-xs text-blue-300">
                  Total All Time: <span className="font-semibold text-white">{formatRupiah(totalSemua)}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase text-center tracking-widest">Nominal (IDR)</label>
                <input type="number" name="nominal" required value={formData.nominal} onChange={handleChange} className="w-full text-center text-4xl font-extrabold text-blue-950 bg-transparent outline-none p-2" placeholder="0" />
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Item Name</label>
                <input type="text" name="item" required value={formData.item} onChange={handleChange} className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 outline-none font-medium text-blue-950" placeholder="e.g., Nasi Padang" />
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Date</label>
                <input type="date" name="tanggal" required value={formData.tanggal} onChange={handleChange} className="w-full bg-gray-50 rounded-xl p-3 text-sm font-semibold text-blue-950 cursor-pointer border border-gray-200" />
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, kategori: cat })}
                      className={`p-3 rounded-xl text-xs font-bold transition-all ${formData.kategori === cat ? 'bg-blue-950 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_method: pm })}
                      className={`p-3 rounded-xl text-xs font-bold transition-all ${formData.payment_method === pm ? 'bg-blue-950 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Paid From</label>
                <div className="grid grid-cols-2 gap-4">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paid_from: user.id })}
                      className={`flex flex-col items-center p-4 rounded-2xl transition-all border-2 ${formData.paid_from === user.id ? 'border-blue-950 bg-blue-50' : 'border-transparent bg-gray-50'}`}
                    >
                      <img src={user.image} className="w-14 h-14 rounded-full mb-2 shadow-sm" alt={user.name} />
                      <span className="text-sm font-bold">{user.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-950 text-white font-extrabold text-lg py-4 rounded-3xl shadow-lg hover:bg-blue-900 transition-all disabled:bg-blue-200">
                {loading ? 'SAVING...' : 'Save Expense'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'riwayat' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* TAB FILTER DIUBAH MENJADI TYO & EL */}
            <div className="flex justify-around gap-2 p-1 bg-white rounded-full border border-gray-100 shadow-sm mb-4">
              {['All', 'Tyo', 'El'].map((f) => (
                <button key={f} onClick={() => setActiveFilter(f)} className={`flex-1 p-2.5 rounded-full text-sm font-bold transition-all ${activeFilter === f ? 'bg-blue-950 text-white shadow-md' : 'text-gray-500'}`}>
                  {f}
                </button>
              ))}
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-3xl text-center border border-blue-100">
              <p className="text-xs text-blue-700 font-bold mb-1 uppercase tracking-wider">Total {activeFilter} Bulan Ini</p>
              <p className="text-2xl font-extrabold text-blue-950">{formatRupiah(totalFilteredBulanIni)}</p>
            </div>

            <div className="space-y-4">
              {loadingRiwayat ? (
                <p className="text-center text-gray-500 text-sm">Memuat riwayat...</p>
              ) : filteredRiwayat.length === 0 ? (
                <p className="text-center text-gray-500 text-sm italic">Belum ada transaksi.</p>
              ) : (
                filteredRiwayat.map((item, index) => (
                  <div key={index} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-start relative group">
                    <div>
                      <span className="text-xl font-extrabold text-blue-950 block">{formatRupiah(safeParseFloat(item.nominal))}</span>
                      <p className="text-sm font-bold text-gray-800 mt-1 capitalize">{item.item}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-700 uppercase">{item.kategori}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 uppercase">{item.payment_method}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">{item.paid_from}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{item.tanggal}</span>
                      <button onClick={() => triggerDelete(item.id, 'riwayat')} className="p-1.5 text-red-300 hover:text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-xl font-extrabold text-blue-950">Our Wishlist 🎁</h2>

            <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Barang Impian</label>
                <input type="text" name="item" required value={formData.item} onChange={handleChange} className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 outline-none font-medium text-sm" placeholder="e.g., PS5, Tas Baru..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Estimasi Harga</label>
                <input type="number" name="nominal" required value={formData.nominal} onChange={handleChange} className="w-full rounded-xl border-gray-200 bg-gray-50 p-3.5 outline-none font-medium text-sm" placeholder="IDR" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-950 text-white font-extrabold py-3.5 rounded-2xl">
                {loading ? 'ADDING...' : 'Add to Wishlist'}
              </button>
            </form>

            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Daftar Target Beli</h3>
              {loadingWishlist ? (
                <p className="text-center text-gray-400 text-sm">Memuat wishlist...</p>
              ) : !Array.isArray(wishlistData) || wishlistData.length === 0 ? (
                <p className="text-center text-gray-400 text-sm italic">Belum ada target. Yuk tambahkan!</p>
              ) : (
                wishlistData.map((item, index) => (
                  <div key={index} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-all ${item.status === 'Selesai' ? 'opacity-60 grayscale' : ''}`}>
                    <div className="flex-1">
                      <p className={`font-bold text-blue-950 ${item.status === 'Selesai' ? 'line-through' : ''}`}>{item.item}</p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{formatRupiah(safeParseFloat(item.harga_estimasi))}</p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-1">By: {item.pic}</span>
                    </div>

                    <div className="flex flex-col gap-2 items-end">
                      <span className={`text-[10px] font-extrabold px-3 py-1 rounded-lg ${item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{item.status || 'Pending'}</span>

                      <div className="flex gap-2 mt-1">
                        {item.status !== 'Selesai' && (
                          <button onClick={() => handleCompleteWishlist(item.id)} className="p-1.5 bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-600 rounded-lg transition-all" title="Tandai Selesai">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => triggerDelete(item.id, 'wishlist')} className="p-1.5 bg-red-50 text-red-300 hover:bg-red-100 hover:text-red-500 rounded-lg transition-all" title="Hapus Target">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button onClick={() => setActiveTab('input')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === 'input' ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[11px] font-bold tracking-wide">Record</span>
          </button>

          <button onClick={() => setActiveTab('wishlist')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === 'wishlist' ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-[11px] font-bold tracking-wide">Wishlist</span>
          </button>

          <button onClick={() => setActiveTab('riwayat')} className={`flex-1 flex flex-col items-center p-3 rounded-2xl transition-all ${activeTab === 'riwayat' ? 'text-blue-700 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}>
            <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16" />
            </svg>
            <span className="text-[11px] font-bold tracking-wide">Recent</span>
          </button>
        </div>
      </div>
    </main>
  )
}
