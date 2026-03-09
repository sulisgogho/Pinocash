import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'
import { NextResponse } from 'next/server'

async function getSheet() {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth)
  await doc.loadInfo()
  return doc.sheetsByIndex[0]
}

export async function POST(request) {
  try {
    const sheet = await getSheet()
    const body = await request.json()

    await sheet.addRow({
      ID: Date.now().toString(),
      Tanggal: body.tanggal, // Sekarang menggunakan tanggal yang dipilih dari kalender HP
      Nominal: body.nominal,
      Item: body.item,
      Kategori: body.kategori,
      Metode_Pembayaran: body.payment_method,
      Paid_From: body.paid_from,
      Keterangan: body.keterangan || '-',
    })

    return NextResponse.json({ message: 'Transaksi berhasil dicatat!' }, { status: 200 })
  } catch (error) {
    console.error('Error POST:', error)
    return NextResponse.json({ error: 'Gagal mencatat transaksi' }, { status: 500 })
  }
}

export async function GET() {
  try {
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
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
