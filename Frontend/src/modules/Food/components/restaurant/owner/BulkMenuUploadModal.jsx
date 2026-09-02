import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Trash2,
  Sparkles,
  Info
} from "lucide-react"
import { toast } from "sonner"
import { restaurantAPI } from "@food/api"
import { downloadFile } from "@/shared/utils/downloadUtils"

// Helper to load XLSX dynamically
const loadXlsx = () => {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX)
    const script = document.createElement("script")
    script.src = "https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js"
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX)
      else reject(new Error("XLSX not found after script load"))
    }
    script.onerror = () => reject(new Error("Failed to load XLSX library"))
    document.head.appendChild(script)
  })
}

export default function BulkMenuUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedItems, setParsedItems] = useState([])
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  if (!isOpen) return null

  // Generate and Download Excel Template
  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const XLSX = await loadXlsx()
      const headers = [
        "Name", 
        "Description", 
        "Price", 
        "Category Name", 
        "Food Type (Veg/Non-Veg)", 
        "Preparation Time", 
        "Is Available (TRUE/FALSE)", 
        "Image URL", 
        "Variants (Name:Price, Name:Price)"
      ]
      
      const rows = [
        [
          "Chicken Dum Biryani", 
          "Authentic slow-cooked chicken biryani with aromatic spices & raita", 
          350, 
          "Biryani", 
          "Non-Veg", 
          "30 mins", 
          "TRUE", 
          "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8", 
          "Half:190, Full:350"
        ],
        [
          "Paneer Butter Masala", 
          "Rich and creamy curry made with cottage cheese, butter, and spices", 
          280, 
          "Main Course", 
          "Veg", 
          "20 mins", 
          "TRUE", 
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc7", 
          "Half:160, Full:280"
        ],
        [
          "Butter Naan", 
          "Soft leavened flatbread brushed with fresh butter", 
          45, 
          "Breads", 
          "Veg", 
          "10 mins", 
          "TRUE", 
          "", 
          ""
        ],
        [
          "Cold Coffee", 
          "Chilled brewed coffee blended with milk and vanilla ice cream", 
          120, 
          "Beverages", 
          "Veg", 
          "5 mins", 
          "TRUE", 
          "", 
          "Regular:120, Large:160"
        ]
      ]

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "MenuCatalog")

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      downloadFile({
        data: wbout,
        filename: "zapoo_menu_bulk_upload_template.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
      toast.success("Sample template downloaded successfully!")
    } catch (err) {
      console.error("Template download error:", err)
      toast.error("Failed to generate template. Please check your network connection.")
    } finally {
      setDownloadingTemplate(false)
    }
  }

  // Handle File Selection and Parsing
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setUploadResult(null)
    setParsing(true)

    try {
      const XLSX = await loadXlsx()
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result)
          const workbook = XLSX.read(data, { type: "array" })
          const firstSheet = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheet]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          if (jsonData.length < 2) {
            toast.error("The selected file is empty or missing header columns")
            setSelectedFile(null)
            setParsedItems([])
            setParsing(false)
            return
          }

          const rawHeaders = jsonData[0].map(h => String(h || "").trim().toLowerCase())
          const rows = jsonData.slice(1)

          const items = rows
            .filter(row => row.length > 0 && row[0])
            .map(row => {
              const item = {}
              rawHeaders.forEach((header, index) => {
                const val = row[index]
                if (header.includes("variant") || header.includes("variation")) {
                  if (val && typeof val === "string") {
                    const parsedVariants = val.split(",").map(v => {
                      const parts = v.split(":")
                      if (parts.length === 2) {
                        const vName = parts[0].trim()
                        const vPrice = Number(parts[1].trim())
                        if (vName && !isNaN(vPrice)) {
                          return { name: vName, price: vPrice }
                        }
                      }
                      return null
                    }).filter(Boolean)
                    if (parsedVariants.length > 0) {
                      item.variants = parsedVariants
                    }
                  }
                } else if (header === "name") {
                  item.name = String(val).trim()
                } else if (header.includes("description")) {
                  item.description = String(val || "").trim()
                } else if (header.includes("price")) {
                  item.price = Number(val) || 0
                } else if (header.includes("category")) {
                  item.categoryName = String(val || "Main Menu").trim()
                  item.category = item.categoryName
                } else if (header.includes("type")) {
                  item.foodType = String(val || "Veg").trim()
                  item.isVeg = item.foodType.toLowerCase() === "veg"
                } else if (header.includes("prep")) {
                  item.preparationTime = String(val || "").trim()
                } else if (header.includes("available")) {
                  item.isAvailable = String(val).toLowerCase() === "true"
                } else if (header.includes("image")) {
                  item.image = String(val || "").trim()
                }
              })
              return item
            })
            .filter(item => item.name)

          setParsedItems(items)
          toast.success(`Found ${items.length} valid dishes in file!`)
        } catch (err) {
          console.error("Parse error:", err)
          toast.error("Failed to read Excel data. Please ensure it follows the template.")
          setSelectedFile(null)
          setParsedItems([])
        } finally {
          setParsing(false)
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (err) {
      toast.error("Error reading file.")
      setParsing(false)
    }
  }

  // Handle Upload Submission to Backend
  const handleUploadSubmit = async () => {
    if (parsedItems.length === 0) {
      toast.error("No valid menu items to upload")
      return
    }

    setUploading(true)
    try {
      const res = await restaurantAPI.bulkCreateFood(parsedItems)
      const results = res?.data?.data || res?.data

      const successCount = results?.successCount != null ? results.successCount : parsedItems.length
      const errorCount = results?.errorCount || 0
      const errors = results?.errors || []

      setUploadResult({
        total: parsedItems.length,
        successCount,
        errorCount,
        errors
      })

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} menu items!`)
        onUploadSuccess?.()
      } else {
        toast.error("No items could be saved. Check errors below.")
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to upload bulk menu items"
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setParsedItems([])
    setUploadResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden my-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black font-['Outfit'] text-slate-900 dark:text-white">
                  Bulk Menu Upload
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Import hundreds of dishes in seconds using an Excel spreadsheet
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Step 1: Download Sample Excel Template */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center shrink-0 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Step 1: Download Sample Format
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Get pre-formatted Excel template with sample dishes & columns
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              >
                {downloadingTemplate ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22A2E3]" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#22A2E3]" />
                )}
                <span>Download Template (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: Upload Filled File */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#22A2E3]" />
                Step 2: Upload Your Filled Excel File
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#22A2E3] rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#22A2E3]/15 text-[#22A2E3] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                    Click to select or drag & drop Excel file
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Supports .xlsx, .xls, .csv (up to 500 dishes per file)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {parsedItems.length} dishes detected
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Parsed Summary Preview */}
                  {parsedItems.length > 0 && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-around text-center">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Total Items</span>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{parsedItems.length}</p>
                      </div>
                      <div className="h-6 w-px bg-slate-100 dark:bg-slate-800" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Veg Dishes</span>
                        <p className="text-sm font-black text-emerald-600">
                          {parsedItems.filter(i => i.isVeg).length}
                        </p>
                      </div>
                      <div className="h-6 w-px bg-slate-100 dark:bg-slate-800" />
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Non-Veg Dishes</span>
                        <p className="text-sm font-black text-rose-600">
                          {parsedItems.filter(i => !i.isVeg).length}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload Results Card */}
            {uploadResult && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    Bulk Upload Summary
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center">
                    <p className="text-2xl font-black text-emerald-600">{uploadResult.successCount}</p>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Items Added</span>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-center">
                    <p className="text-2xl font-black text-rose-600">{uploadResult.errorCount}</p>
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Failed / Skipped</span>
                  </div>
                </div>

                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 text-xs text-rose-700 dark:text-rose-400 max-h-32 overflow-y-auto space-y-1">
                    <p className="font-bold">Errors detail:</p>
                    {uploadResult.errors.map((err, i) => (
                      <p key={i} className="text-[11px] font-mono">• {typeof err === 'string' ? err : err.message || JSON.stringify(err)}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {uploadResult ? "Close" : "Cancel"}
            </button>

            {selectedFile && !uploadResult && (
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={uploading || parsing || parsedItems.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading {parsedItems.length} Dishes...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload {parsedItems.length} Dishes</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
