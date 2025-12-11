import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import logoEmpresa from './assets/logo-empresa.jpg'

function App() {
  const [cliente, setCliente] = useState({ nombre: '', nif: '', direccion: '' })
  const [numeroAlbaran, setNumeroAlbaran] = useState('Cargando...')
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date()
    return hoy.toLocaleDateString('es-ES')
  })

  const [lineas, setLineas] = useState([
    { id: 1, concepto: '', cantidad: 1, precio: 0 }
  ])
  const [observaciones, setObservaciones] = useState('')
  const [catalogo, setCatalogo] = useState([])
  const [guardando, setGuardando] = useState(false)

  // --- NUEVO: CALCULAR PRÓXIMO NÚMERO ---
  useEffect(() => {
    const calcularSiguienteNumero = async () => {
      const yearActual = new Date().getFullYear()

      // Buscamos el último albarán creado en la base de datos que empiece por el año actual
      const { data, error } = await supabase
        .from('albaranes')
        .select('numero_albaran')
        .ilike('numero_albaran', `${yearActual}-%`) // Filtra los que empiecen por "2025-"
        .order('id', { ascending: false }) // Ordena del más nuevo al más viejo
        .limit(1)

      if (error) {
        console.error('Error calculando número:', error)
        return
      }

      if (data && data.length > 0) {
        // Si existe un último albarán (ej: "2025-042")
        const ultimoNumero = data[0].numero_albaran
        const partes = ultimoNumero.split('-') // Separa ["2025", "042"]
        const secuencia = parseInt(partes[1]) // Convierte "042" a número 42

        // Sumamos 1 y rellenamos con ceros a la izquierda (pad)
        const nuevaSecuencia = (secuencia + 1).toString().padStart(3, '0')
        setNumeroAlbaran(`${yearActual}-${nuevaSecuencia}`)
      } else {
        // Si es el primero del año
        setNumeroAlbaran(`${yearActual}-003`)
      }
    }

    calcularSiguienteNumero()
  }, []) // Se ejecuta solo al abrir la página

  useEffect(() => {
    const cargarProductos = async () => {
      const { data } = await supabase.from('productos').select('*').order('nombre')
      if (data) setCatalogo(data)
    }
    cargarProductos()
  }, [])

  const actualizarLinea = (id, campo, valor) => {
    const nuevasLineas = lineas.map((linea) => {
      if (linea.id === id) {
        let cambios = { [campo]: valor }
        if (campo === 'concepto') {
          const productoEncontrado = catalogo.find(p => p.nombre === valor)
          if (productoEncontrado) cambios.precio = productoEncontrado.precio
        }
        return { ...linea, ...cambios }
      }
      return linea
    })
    setLineas(nuevasLineas)
  }

  const agregarLinea = () => setLineas([...lineas, { id: Date.now(), concepto: '', cantidad: 1, precio: 0 }])
  const borrarLinea = (id) => setLineas(lineas.filter(linea => linea.id !== id))

  const baseImponible = lineas.reduce((sum, linea) => sum + (linea.cantidad * linea.precio), 0)
  const iva = baseImponible * 0.21
  const total = baseImponible + iva

  const guardarEnNube = async () => {
    setGuardando(true)
    try {
      const { data: albaranData, error: albaranError } = await supabase
        .from('albaranes')
        .insert([{
          cliente_nombre: cliente.nombre,
          cliente_nif: cliente.nif,
          cliente_direccion: cliente.direccion,
          numero_albaran: numeroAlbaran,
          fecha: fecha,
          observaciones: observaciones,
          total: total
        }]).select()

      if (albaranError) throw albaranError
      const albaranId = albaranData[0].id

      const lineasParaGuardar = lineas.map(linea => ({
        albaran_id: albaranId,
        concepto: linea.concepto,
        cantidad: linea.cantidad,
        precio: linea.precio,
        total_linea: linea.cantidad * linea.precio
      }))

      const { error: lineasError } = await supabase.from('lineas_albaran').insert(lineasParaGuardar)
      if (lineasError) throw lineasError
      alert('¡Albarán guardado! ☁️')
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const imprimirPDF = () => {
    window.print()
  }

  return (
    // CAMBIO RESPONSIVE: Padding menor en móvil (p-4) y mayor en escritorio (md:p-8)
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans print:p-0">

      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-4 md:p-8 print:shadow-none print:w-full">

        {/* CABECERA: Flex-col en móvil, Flex-row en escritorio Y EN IMPRESIÓN */}
        <div className="flex flex-col md:flex-row print:flex-row justify-between items-start mb-8 gap-6 md:gap-0 print:gap-0">

          {/* LADO IZQUIERDO: LOGO */}
          <div className="w-full md:w-auto print:w-auto">
            <img
              src={logoEmpresa}
              alt="Logo TR Servicios del Agua"
              className="w-64 md:w-80 h-auto object-contain mb-4 md:mb-0 print:mb-0 print:w-64"
            />
          </div>

          {/* LADO DERECHO: DATOS DEL ALBARÁN */}
          <div className="w-full md:w-auto print:w-auto text-left md:text-right print:text-right">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 uppercase">ALBARÁN</h2>

            <div className="flex items-center justify-start md:justify-end print:justify-end mt-1">
              <span className="text-gray-700">Nº:</span>
              <input
                value={numeroAlbaran}
                onChange={(e) => setNumeroAlbaran(e.target.value)}
                className="ml-2 w-24 text-right border-b border-dotted focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-start md:justify-end print:justify-end">
              <span className="text-gray-700">Fecha:</span>
              <input
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="ml-2 w-24 text-right border-b border-dotted focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* DATOS: Grid de 1 columna en móvil, 2 en escritorio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase border-b pb-1">DATOS CLIENTE</h3>
            <div className="flex items-center mb-2">
              <label className="text-gray-700 w-24 md:w-32 font-medium">Cliente:</label>
              <input type="text" value={cliente.nombre} onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })} className="flex-1 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none w-full" />
            </div>
            <div className="flex items-center mb-2">
              <label className="text-gray-700 w-24 md:w-32 font-medium">NIF/DNI:</label>
              <input type="text" value={cliente.nif} onChange={(e) => setCliente({ ...cliente, nif: e.target.value })} className="flex-1 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none w-full" />
            </div>
            <div className="flex items-center">
              <label className="text-gray-700 w-24 md:w-32 font-medium">Dirección:</label>
              <input type="text" value={cliente.direccion} onChange={(e) => setCliente({ ...cliente, direccion: e.target.value })} className="flex-1 border border-gray-300 rounded-sm px-2 py-1 focus:outline-none w-full" />
            </div>
          </div>
        </div>

        {/* TABLA: Contenedor con scroll horizontal para móvil */}
        <div className="mb-8 border-t border-l border-r border-gray-300 overflow-x-auto">
          {/* Forzamos un ancho mínimo (min-w) para que la tabla no se aplaste en móvil */}
          <div className="min-w-[600px]">
            <div className="grid grid-cols-12 bg-gray-500 text-white font-bold text-sm uppercase py-2 px-2 print:bg-gray-200 print:text-black">
              <div className="col-span-2 text-center">CANT.</div>
              <div className="col-span-6">DESCRIPCIÓN</div>
              <div className="col-span-2 text-right pr-4">PRECIO</div>
              <div className="col-span-2 text-right pr-4">TOTAL</div>
            </div>

            {lineas.map((linea) => (
              <div key={linea.id} className="grid grid-cols-12 items-center border-b border-gray-300 py-2 px-2 group">
                <div className="col-span-2">
                  <input type="number" value={linea.cantidad} onChange={(e) => actualizarLinea(linea.id, 'cantidad', Number(e.target.value))} className="w-full text-center bg-transparent focus:outline-none" />
                </div>
                <div className="col-span-6 relative">
                  <input type="text" list="lista-productos" value={linea.concepto} onChange={(e) => actualizarLinea(linea.id, 'concepto', e.target.value)} className="w-full bg-transparent focus:outline-none" placeholder="Escribe..." />
                </div>
                <div className="col-span-2 text-right pr-4">
                  <input type="number" value={linea.precio} onChange={(e) => actualizarLinea(linea.id, 'precio', Number(e.target.value))} className="w-full text-right bg-transparent focus:outline-none" />
                </div>
                <div className="col-span-2 text-right font-medium pr-4">{(linea.cantidad * linea.precio).toFixed(2)} €</div>

                <button onClick={() => borrarLinea(linea.id)} className="absolute right-2 text-red-500 opacity-0 group-hover:opacity-100 font-bold no-print text-xl">&times;</button>
              </div>
            ))}
          </div>

          <div className="p-2 no-print">
            <button onClick={agregarLinea} className="text-blue-600 font-medium flex items-center p-2 hover:bg-blue-50 rounded"><span className="text-lg mr-1">+</span> Añadir línea</button>
          </div>
        </div>

        <datalist id="lista-productos">{catalogo.map(prod => (<option key={prod.id} value={prod.nombre}>{prod.precio} €</option>))}</datalist>

        {/* TOTALES: Flex-col en móvil */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-8">
          <div className="w-full md:w-1/2">
            <h3 className="text-lg font-bold text-gray-800 mb-2 uppercase">OBSERVACIONES:</h3>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className="w-full h-24 border border-gray-300 rounded-sm p-2 focus:outline-none resize-none"></textarea>
          </div>

          <div className="w-full md:w-1/2 text-right space-y-2 pt-0 md:pt-8">
            <div className="flex justify-between text-gray-700 font-bold"><span>SUBTOTAL:</span><span>{baseImponible.toFixed(2)} €</span></div>
            <div className="flex justify-between text-gray-700 font-bold"><span>IVA (21%):</span><span>{iva.toFixed(2)} €</span></div>
            <div className="flex justify-between text-xl font-bold text-blue-600 pt-2 border-t mt-2"><span>TOTAL:</span><span>{total.toFixed(2)} €</span></div>
          </div>
        </div>

        {/* FIRMAS: Stack en móvil, columnas en escritorio 
        <div className="flex flex-col md:flex-row justify-between mt-12 gap-12 md:gap-0 break-inside-avoid">
          <div className="w-full md:w-5/12 text-center">
            <div className="h-16 mb-2 border-b-2 border-gray-400"></div>
            <p className="font-bold text-gray-800 uppercase text-sm">FIRMA TÉCNICO</p>
          </div>
          <div className="w-full md:w-5/12 text-center">
            <div className="h-16 mb-2 border-b-2 border-gray-400"></div>
            <p className="font-bold text-gray-800 uppercase text-sm">FIRMA CLIENTE</p>
          </div>
        </div>*/}

        {/* BOTONERA: Ajustada para móviles */}
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col gap-3 no-print z-50">
          <button
            onClick={imprimirPDF}
            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-white font-bold shadow-lg bg-gray-700 hover:bg-gray-900 transition transform hover:scale-105 text-sm md:text-base"
          >
            <span>🖨️ PDF</span>
          </button>

          <button
            onClick={guardarEnNube}
            disabled={guardando}
            className={`flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-white font-bold shadow-lg transition transform hover:scale-105 active:scale-95 text-sm md:text-base ${guardando ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <span>{guardando ? '...' : '💾 Guardar'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

export default App