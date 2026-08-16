import { useState, useMemo } from "react"
import { exportToExcel, exportToPDF } from "./ordersExportUtils"
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export function useGenericTableManagement(data, title, searchFields = []) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filters, setFilters] = useState({})
  const [visibleColumns, setVisibleColumns] = useState({})

  // Apply search
  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply search query
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(item => 
        searchFields.some(field => {
          const value = item[field]
          return value && value.toString().toLowerCase().includes(query)
        })
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "") {
        result = result.filter(item => {
          const itemValue = item[key]
          if (itemValue === undefined || itemValue === null) return false
          return itemValue.toString().toLowerCase() === value.toString().toLowerCase()
        })
      }
    })

    return result
  }, [data, searchQuery, searchFields, filters])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(v => v && v !== "").length
  }, [filters])

  // Count results
  const count = filteredData.length

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters)
    setIsFilterOpen(false)
  }

  const handleResetFilters = () => {
    setFilters({})
    setIsFilterOpen(false)
  }

  const handleExport = (type) => {
    if (type === "excel") {
      exportToExcel(filteredData, title)
    } else if (type === "pdf") {
      exportToPDF(filteredData, title)
    }
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setIsViewOrderOpen(true)
  }

  const handlePrintOrder = async (order) => {
    try {
      // Dynamic import of jsPDF and autoTable for instant PDF download
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const settings = getCachedSettings() || await loadBusinessSettings()
      const companyName = settings?.companyName || "Zapoo"
      const zapooFssai = settings?.fssai || "10019064001810"
      const zapooGstin = settings?.gstin || "19AAZCS8726L1Z5"
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Add title
      doc.setFontSize(18)
      doc.setTextColor(30, 30, 30)
      doc.setFont(undefined, 'bold')
      doc.text(companyName, 105, 16, { align: 'center' })
      doc.setFontSize(13)
      doc.setFont(undefined, 'normal')
      doc.text('Order Invoice', 105, 23, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(70, 70, 70)
      doc.text(`FSSAI: ${zapooFssai}   |   GSTIN: ${zapooGstin}`, 105, 29, { align: 'center' })
      
      // Order ID
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100)
      const orderId = order.orderId || order.id || order.subscriptionId || 'N/A'
      doc.text(`Order ID: ${orderId}`, 105, 35, { align: 'center' })
      
      // Date
      const orderDate = order.date && order.time ? `${order.date}, ${order.time}` : (order.date || new Date().toLocaleDateString())
      doc.text(`Date: ${orderDate}`, 105, 40, { align: 'center' })
      
      let startY = 48
      
      // Customer Information
      if (order.customerName || order.customerPhone) {
        doc.setFontSize(12)
        doc.setTextColor(30, 30, 30)
        doc.text('Customer Information', 14, startY)
        startY += 8
        
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        if (order.customerName) {
          doc.text(`Name: ${order.customerName}`, 14, startY)
          startY += 6
        }
        if (order.customerPhone) {
          doc.text(`Phone: ${order.customerPhone}`, 14, startY)
          startY += 6
        }
        startY += 5
      }
      
      // Restaurant Information
      if (order.restaurant) {
        doc.setFontSize(12)
        doc.setTextColor(30, 30, 30)
        doc.text('Restaurant', 14, startY)
        startY += 8
        
        doc.setFontSize(10)
        doc.setTextColor(60, 60, 60)
        doc.text(order.restaurant, 14, startY)
        startY += 10
      }
      
      // Order Items Table
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        const tableData = order.items.map((item) => [
          item.quantity || 1,
          item.name || item.itemName || item.title || 'Unknown Item',
          `Rs. ${(item.price || 0).toFixed(2)}`,
          `Rs. ${((item.quantity || 1) * (item.price || 0)).toFixed(2)}`
        ])
        
        autoTable(doc, {
          startY: startY,
          head: [['Qty', 'Item Name', 'Price', 'Total']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [30, 30, 30]
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250]
          },
          styles: {
            cellPadding: 4,
            lineColor: [200, 200, 200],
            lineWidth: 0.5
          },
          columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
          },
          margin: { left: 14, right: 14 }
        })
        
        startY = doc.lastAutoTable.finalY + 10
      }
      
      // Total Amount
      if (order.totalAmount) {
        doc.setFontSize(13)
        doc.setTextColor(30, 30, 30)
        doc.setFont(undefined, 'bold')
        const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : order.totalAmount
        doc.text(`Total Amount: Rs. ${totalAmount}`, 14, startY)
        startY += 8
      }
      
      // Payment Status
      if (order.paymentStatus) {
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.setFont(undefined, 'normal')
        doc.text(`Payment Status: ${order.paymentStatus}`, 14, startY)
        startY += 6
      }
      
      // Order Status
      if (order.orderStatus) {
        doc.setFontSize(10)
        doc.text(`Order Status: ${order.orderStatus}`, 14, startY)
      }

      // Footer
      const footerY = 275
      doc.setDrawColor(226, 232, 240)
      doc.line(14, footerY - 5, 196, footerY - 5)
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, footerY)
      doc.text(`${companyName} Platform • FSSAI: ${zapooFssai} • GSTIN: ${zapooGstin}`, 196, footerY, { align: 'right' })
      
      // Save the PDF instantly
      const filename = `Invoice_${orderId}_${new Date().toISOString().split("T")[0]}.pdf`
      doc.save(filename)
    } catch (error) {
      debugError("Error generating PDF invoice:", error)
      alert("Failed to download PDF invoice. Please try again.")
    }
  }

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  const resetColumns = (defaultColumns) => {
    setVisibleColumns(defaultColumns || {})
  }

  return {
    searchQuery,
    setSearchQuery,
    isFilterOpen,
    setIsFilterOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isViewOrderOpen,
    setIsViewOrderOpen,
    selectedOrder,
    filters,
    setFilters,
    visibleColumns,
    filteredData,
    count,
    activeFiltersCount,
    handleApplyFilters,
    handleResetFilters,
    handleExport,
    handleViewOrder,
    handlePrintOrder,
    toggleColumn,
    resetColumns }
}

