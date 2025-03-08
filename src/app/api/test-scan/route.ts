import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Ruta al archivo PDF de prueba
    const pdfPath = path.join(process.cwd(), 'PDF', 'account.report_invoice (2)-7-9.pdf');
    
    // Verificar si el archivo existe
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: "Archivo de prueba no encontrado" }, { status: 404 });
    }
    
    // Leer el archivo
    const fileBuffer = fs.readFileSync(pdfPath);
    const base64Data = fileBuffer.toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      message: "Archivo PDF leído correctamente",
      fileSize: fileBuffer.length,
      base64Preview: base64Data.substring(0, 100) + '...' // Solo para verificar
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Error al leer el archivo de prueba" 
    }, { status: 500 });
  }
}