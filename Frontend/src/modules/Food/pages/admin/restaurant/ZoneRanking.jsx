import { useState, useEffect } from "react"
import { MapPin, Search } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { adminAPI } from "@food/api"

export default function ZoneRanking() {
  const [zones, setZones] = useState([])
  const [searchParams] = useSearchParams()
  const initialZone = searchParams.get("zone") || ""
  const [selectedZone, setSelectedZone] = useState(initialZone)
  const [restaurants, setRestaurants] = useState([])
  const [loadingZones, setLoadingZones] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [changedRanks, setChangedRanks] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchZones()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedZone])

  useEffect(() => {
    if (selectedZone) {
      setChangedRanks({})
      fetchRestaurants(selectedZone)
    } else {
      setRestaurants([])
    }
  }, [selectedZone])

  const fetchZones = async () => {
    try {
      setLoadingZones(true)
      const response = await adminAPI.getZones()
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones)
      }
    } catch (error) {
      console.error("Error fetching zones:", error)
      setZones([])
    } finally {
      setLoadingZones(false)
    }
  }

  const fetchRestaurants = async (zoneId) => {
    try {
      setLoadingRestaurants(true)
      const response = await adminAPI.getRestaurants({ zoneId })
      if (response.data?.success && response.data.data?.restaurants) {
        setRestaurants(response.data.data.restaurants)
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error)
      setRestaurants([])
    } finally {
      setLoadingRestaurants(false)
    }
  }

  const handleRankChangeLocal = (restaurantId, newRank) => {
    const parsedRank = newRank === "none" ? null : parseInt(newRank, 10);
    
    setChangedRanks(prev => ({
      ...prev,
      [restaurantId]: parsedRank
    }));

    setRestaurants(prev => 
      prev.map(r => 
        r.id === restaurantId || r._id === restaurantId ? { ...r, zoneRank: parsedRank } : r
      )
    );
  }

  const handleSaveAll = async () => {
    const changes = Object.entries(changedRanks);
    if (changes.length === 0) return;

    try {
      setIsSaving(true);
      await Promise.all(
        changes.map(([restaurantId, rank]) => 
          adminAPI.updateRestaurantZoneRank(restaurantId, rank)
        )
      );
      alert("Rankings saved successfully");
      setChangedRanks({});
    } catch (error) {
      console.error("Error saving rankings:", error);
      alert("Failed to save some rankings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const filteredRestaurants = restaurants.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.restaurantName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRestaurants.length / itemsPerPage) || 1;
  const paginatedRestaurants = filteredRestaurants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Zone Restaurant Ranking</h1>
            <p className="text-sm text-slate-600">Select a zone to rank up to 100 restaurants at the top</p>
          </div>
          {Object.keys(changedRanks).length > 0 && (
            <div className="ml-auto">
              <button 
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Rankings"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={loadingZones}
              >
                <option value="">-- Choose a Zone --</option>
                {zones.map(z => (
                  <option key={z._id || z.id} value={z._id || z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search Restaurant</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedZone || loadingRestaurants}
                />
              </div>
            </div>
          </div>
        </div>

        {selectedZone && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Restaurant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Rank</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loadingRestaurants ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        Loading restaurants...
                      </td>
                    </tr>
                  ) : filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                        No restaurants found in this zone.
                      </td>
                    </tr>
                  ) : (
                    paginatedRestaurants.map(r => (
                      <tr key={r.id || r._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 shrink-0">
                              <img 
                                className="h-10 w-10 rounded-full object-cover" 
                                src={typeof r.profileImage === 'string' && r.profileImage ? r.profileImage : (r.profileImage?.url || "https://placehold.co/100x100")} 
                                alt={r.name || r.restaurantName} 
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-slate-900">{r.name || r.restaurantName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {r.rating || 0} ★
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.zoneRank ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                            {r.zoneRank ? `Rank ${r.zoneRank}` : 'Unranked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <select 
                            value={r.zoneRank || "none"}
                            onChange={(e) => handleRankChangeLocal(r.id || r._id, e.target.value)}
                            className="ml-auto block w-32 px-3 py-1.5 text-base border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="none">None</option>
                            {[...Array(100)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Rank {i + 1}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {filteredRestaurants.length > 0 && (
              <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-700">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredRestaurants.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredRestaurants.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-700">Items per page:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
