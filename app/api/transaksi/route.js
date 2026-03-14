import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import { NextResponse } from 'next/server'

// Fungsi untuk memilih sheet yang tepat
async function getSheet(sheetName = null) {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth)
  await doc.loadInfo()

  if (sheetName) return doc.sheetsByTitle[sheetName]
  return doc.sheetsByIndex[0]
}

// 1. FUNGSI SIMPAN DATA (POST)
export async function POST(request) {
  try {
    const body = await request.json()
    if (body.isWishlist) {
      const sheet = await getSheet('Wishlist')
      await sheet.addRow({
        ID: Date.now().toString(),
        Tanggal: body.tanggal,
        Item: body.item,
        Harga_Estimasi: body.nominal,
        PIC: body.paid_from,
        Status: 'Pending',
      })
    } else {
      const sheet = await getSheet()
      await sheet.addRow({
        ID: Date.now().toString(),
        Tanggal: body.tanggal,
        Nominal: body.nominal,
        Item: body.item,
        Kategori: body.kategori,
        Metode_Pembayaran: body.payment_method,
        Paid_From: body.paid_from,
        Keterangan: body.keterangan || '-',
      })
    }
    return NextResponse.json({ message: 'Success!' }, { status: 200 })
  } catch (error) {
    console.error('Error POST:', error)
    return NextResponse.json({ error: 'Gagal mencatat' }, { status: 500 })
  }
}

// 2. FUNGSI AMBIL DATA (GET)
export async function GET(request) {
  try {
    const type = request.nextUrl.searchParams.get('type')

    if (type === 'wishlist') {
      const sheet = await getSheet('Wishlist')
      if (!sheet) return NextResponse.json([], { status: 200 })
      const rows = await sheet.getRows()
      const data = rows.map((row) => ({
        id: row.get('ID'),
        tanggal: row.get('Tanggal'),
        item: row.get('Item'),
        harga_estimasi: row.get('Harga_Estimasi'),
        pic: row.get('PIC'),
        status: row.get('Status'),
      }))
      return NextResponse.json(data.reverse(), { status: 200 })
    }

    const sheet = await getSheet()
    const rows = await sheet.getRows()
    const data = rows.map((row) => ({
      id: row.get('ID'),
      tanggal: row.get('Tanggal'),
      nominal: row.get('Nominal'),
      item: row.get('Item'),
      kategori: row.get('Kategori'),
      payment_method: row.get('Metode_Pembayaran'),
      paid_from: row.get('Paid_From'),
      keterangan: row.get('Keterangan'),
    }))
    return NextResponse.json(data.reverse(), { status: 200 })
  } catch (error) {
    console.error('Error GET:', error)
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

// 3. FUNGSI HAPUS DATA (DELETE) - BARU!
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // 'wishlist' atau 'riwayat'

    const sheet = await getSheet(type === 'wishlist' ? 'Wishlist' : null)
    const rows = await sheet.getRows()

    // Cari baris berdasarkan ID yang dikirim
    const rowToDelete = rows.find((row) => row.get('ID') === id)
    if (rowToDelete) {
      await rowToDelete.delete() // Hapus baris dari Google Sheets
      return NextResponse.json({ message: 'Berhasil dihapus' }, { status: 200 })
    }
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  } catch (error) {
    console.error('Error DELETE:', error)
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}

// 4. FUNGSI UPDATE DATA (PUT) - BARU! (Untuk Selesaikan Wishlist)
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, status } = body

    const sheet = await getSheet('Wishlist')
    const rows = await sheet.getRows()

    const rowToUpdate = rows.find((row) => row.get('ID') === id)
    if (rowToUpdate) {
      rowToUpdate.set('Status', status) // Ubah sel Status
      await rowToUpdate.save() // Simpan perubahan ke Google Sheets
      return NextResponse.json({ message: 'Berhasil diupdate' }, { status: 200 })
    }
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  } catch (error) {
    console.error('Error PUT:', error)
    return NextResponse.json({ error: 'Gagal update data' }, { status: 500 })
  }
}
