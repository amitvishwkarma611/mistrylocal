import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Hammer, 
  Wrench, 
  Zap, 
  User, 
  Phone, 
  Star, 
  MapPin, 
  Wallet,
  Briefcase,
  Calendar,
  Search,
  Home,
  BarChart3,
  Settings,
  Menu,
  X
} from 'lucide-react';

// Standalone Admin Panel Component
export const AdminPanelStandalone = () => {
  const [customers, setCustomers] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
  const [plumbers, setPlumbers] = useState([]);
  const [electricians, setElectricians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('desc');
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch real data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Dynamically import Firebase modules
        const { initializeApp } = await import('firebase/app');
        const { getFirestore, collection, getDocs, query, orderBy } = await import('firebase/firestore');
        
        // Firebase configuration
        const firebaseConfig = {
          apiKey: "AIzaSyBZjWSMwy4fRZWaWfxPYJkoUYuuDGeztJQ",
          authDomain: "mistrylocal.firebaseapp.com",
          projectId: "mistrylocal",
          storageBucket: "mistrylocal.appspot.com",
          messagingSenderId: "750342760966",
          appId: "1:750342760966:web:f9233c965f3ba10ef75930",
          measurementId: "G-NQ7964WE7W"
        };
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // Fetch customers
        const customersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const customersSnapshot = await getDocs(customersQuery);
        const customersData = [];
        
        customersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'customer') {
            customersData.push({
              id: doc.id,
              ...data,
              name: data.name || 'Unnamed Customer',
              phone: data.phone || 'No phone',
              email: data.email || 'No email',
              address: data.address || {},
              totalBookings: data.totalBookings || 0,
              rating: data.rating || 0,
              registrationDate: data.createdAt || null,
              lastActive: data.lastActive || data.updatedAt || data.createdAt || null
            });
          }
        });
        
        // Fetch workers from all profession collections
        const professions = ['carpenters', 'plumbers', 'electricians'];
        const workersData = {
          carpenters: [],
          plumbers: [],
          electricians: []
        };
        
        for (const profession of professions) {
          try {
            const workersQuery = query(collection(db, profession), orderBy('createdAt', 'desc'));
            const workersSnapshot = await getDocs(workersQuery);
            
            workersSnapshot.forEach((doc) => {
              const data = doc.data();
              workersData[profession].push({
                id: doc.id,
                ...data,
                name: data.name || 'Unnamed Worker',
                phone: data.phone || data.mobileNumber || 'No phone',
                rating: data.rating || data.averageRating || 0,
                ratingCount: data.ratingCount || data.totalReviews || 0,
                jobsCompleted: data.jobsCompleted || data.completedJobs || 0,
                verified: data.verified || false,
                distance: 'N/A',
                specialties: data.specialties || data.services || [],
                acceptsSmallJobs: data.acceptsSmallJobs !== undefined ? data.acceptsSmallJobs : true,
                image: data.profilePhotoUrl || data.image || '',
                lat: data.lat || data.latitude || 0,
                lng: data.lng || data.longitude || 0,
                trustScore: data.trustScore || Math.min(100, Math.max(0, (data.jobsCompleted || 0) * 2 + (data.rating || 0) * 10)) || 0,
                profession: profession.slice(0, -1), // Remove 's' from plural
                address: data.address || {},
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null,
                weeklyEarnings: data.weeklyEarnings || 0
              });
            });
          } catch (error) {
            console.warn(`Error fetching ${profession}:`, error);
          }
        }
        
        setCustomers(customersData);
        setCarpenters(workersData.carpenters);
        setPlumbers(workersData.plumbers);
        setElectricians(workersData.electricians);
        
      } catch (error) {
        console.error('Error fetching real data:', error);
        // Fallback to mock data if Firebase fails
        const mockCustomers = [
          {
            id: '1',
            name: 'Rajesh Kumar',
            phone: '+91 9876543210',
            email: 'rajesh@example.com',
            address: { city: 'Delhi', area: 'South Delhi' },
            totalBookings: 12,
            rating: 4.5
          }
        ];

        const mockWorkers = [
          {
            id: '101',
            name: 'Amit Verma',
            phone: '+91 9876543220',
            rating: 4.9,
            ratingCount: 45,
            jobsCompleted: 120,
            verified: true,
            distance: '2.5 km',
            specialties: ['Furniture Repair', 'Custom Woodwork'],
            acceptsSmallJobs: true,
            image: 'https://picsum.photos/200',
            lat: 28.6139,
            lng: 77.2090,
            trustScore: 95,
            profession: 'carpenter',
            address: { city: 'Delhi', area: 'Connaught Place' }
          }
        ];

        setCustomers(mockCustomers);
        setCarpenters(mockWorkers.filter(w => w.profession === 'carpenter'));
        setPlumbers(mockWorkers.filter(w => w.profession === 'plumber'));
        setElectricians(mockWorkers.filter(w => w.profession === 'electrician'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort functions (same as main admin panel)
  const filteredCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.address?.city && customer.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.address?.area && customer.address.area.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const allWorkers = [...carpenters, ...plumbers, ...electricians];
  const filteredWorkers = allWorkers
    .filter(worker => 
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm) ||
      (worker.address?.city && worker.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worker.address?.area && worker.address.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
      worker.profession?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'jobs':
          comparison = (a.jobsCompleted || 0) - (b.jobsCompleted || 0);
          break;
        case 'trust':
          comparison = (a.trustScore || 0) - (b.trustScore || 0);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const filterWorkers = (workers) => 
    workers.filter(worker => 
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone.includes(searchTerm) ||
      (worker.address?.city && worker.address.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (worker.address?.area && worker.address.area.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const filteredCarpenters = filterWorkers(carpenters);
  const filteredPlumbers = filterWorkers(plumbers);
  const filteredElectricians = filterWorkers(electricians);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-10 bg-gray-200 rounded-lg w-40"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-32"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-24"></div>
              </div>
            </div>
          </div>
          
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Content area skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="h-6 bg-gray-200 rounded mb-6 w-40"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">MistryLocal Admin</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Home size={20} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'customers' ? 'bg-green-100 text-green-700 border border-green-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Users size={20} />
            Customers
          </button>
          
          <button 
            onClick={() => setActiveTab('workers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'workers' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Briefcase size={20} />
            Workers
          </button>
          
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'analytics' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'settings' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
                <p className="text-gray-600">Manage your platform efficiently</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64"
                />
              </div>
              
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="jobs">Jobs</option>
                <option value="trust">Trust</option>
              </select>
              
              <button 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className={`px-3 py-2 rounded-lg ${sortOrder === 'asc' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'Total Customers', count: filteredCustomers.length, icon: Users, color: 'green', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
                  { title: 'Total Carpenters', count: filteredCarpenters.length, icon: Hammer, color: 'amber', bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
                  { title: 'Total Plumbers', count: filteredPlumbers.length, icon: Wrench, color: 'blue', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
                  { title: 'Total Electricians', count: filteredElectricians.length, icon: Zap, color: 'purple', bgColor: 'bg-purple-100', iconColor: 'text-purple-600' }
                ].map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stat.count}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                        <stat.icon className={stat.iconColor} size={24} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">User Distribution</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Customers</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{width: `${(filteredCustomers.length / (filteredCustomers.length + allWorkers.length)) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8">{filteredCustomers.length}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Workers</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{width: `${(allWorkers.length / (filteredCustomers.length + allWorkers.length)) * 100}%`}}></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-8">{allWorkers.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performers</h3>
                  <div className="space-y-3">
                    {allWorkers
                      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                      .slice(0, 4)
                      .map(worker => (
                        <div key={worker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm">
                              {worker.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{worker.name}</p>
                              <p className="text-xs text-gray-500 capitalize">{worker.profession}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star size={14} fill="currentColor" className="text-yellow-500" />
                            <span className="font-bold text-gray-900 text-sm">{worker.rating || 0}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="text-green-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Customers ({filteredCustomers.length})</h2>
              </div>
              {filteredCustomers.length > 0 ? (
                <div className="grid gap-4">
                  {filteredCustomers.map(customer => (
                    <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0">
                          <User className="text-green-600" size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-lg mb-3 truncate">{customer.name}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { icon: Phone, value: customer.phone || 'No phone', color: 'text-gray-600' },
                              { icon: MapPin, value: customer.address?.city || customer.address?.area || 'No location', color: 'text-gray-600' },
                              { icon: Briefcase, value: `Total Bookings: ${customer.totalBookings || 0}`, color: 'text-gray-600' },
                              { icon: Calendar, value: `Member since: ${customer.registrationDate ? 'Available' : 'N/A'}`, color: 'text-gray-600' }
                            ].map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <item.icon size={16} className={item.color} />
                                <span className="truncate">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Users className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workers' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Hammer className="text-blue-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Workers ({filteredWorkers.length})</h2>
              </div>
              
              {filteredWorkers.length > 0 ? (
                <div className="grid gap-4">
                  {filteredWorkers.map(worker => {
                    const getProfessionStyle = (profession) => {
                      switch(profession) {
                        case 'carpenter': return { bg: 'from-amber-100 to-amber-200', text: 'text-amber-600', icon: Hammer };
                        case 'plumber': return { bg: 'from-blue-100 to-blue-200', text: 'text-blue-600', icon: Wrench };
                        case 'electrician': return { bg: 'from-purple-100 to-purple-200', text: 'text-purple-600', icon: Zap };
                        default: return { bg: 'from-gray-100 to-gray-200', text: 'text-gray-600', icon: Briefcase };
                      }
                    };
                    
                    const style = getProfessionStyle(worker.profession || 'carpenter');
                    
                    return (
                      <div key={worker.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${style.bg} flex-shrink-0`}>
                            <style.icon className={style.text} size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-bold text-gray-900 text-lg truncate">{worker.name}</h3>
                              {worker.verified && (
                                <div className="p-1 bg-blue-100 rounded-full flex-shrink-0">
                                  <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              {[
                                { icon: Phone, value: worker.phone || 'No phone', color: 'text-gray-600' },
                                { icon: MapPin, value: worker.address?.city || worker.address?.area || 'No location', color: 'text-gray-600' },
                                { icon: Star, value: `${worker.rating || 0} (${worker.ratingCount || 0} reviews)`, color: 'text-gray-600' },
                                { icon: Briefcase, value: `${worker.jobsCompleted || 0} jobs completed`, color: 'text-gray-600' },
                                { icon: Wallet, value: `Trust Score: ${worker.trustScore || 0}`, color: 'text-gray-600' },
                                { icon: null, value: worker.profession || 'carpenter', color: 'text-gray-700', badge: true }
                              ].map((item, idx) => (
                                item.badge ? (
                                  <div key={idx} className="flex items-center">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                                      {item.value}
                                    </span>
                                  </div>
                                ) : (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    {item.icon && <item.icon size={16} className={item.color} />}
                                    <span className="truncate">{item.value}</span>
                                  </div>
                                )
                              ))}
                            </div>
                            
                            {worker.specialties && worker.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {worker.specialties.slice(0, 3).map((specialty, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                    {specialty}
                                  </span>
                                ))}
                                {worker.specialties.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                    +{worker.specialties.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <Hammer className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No workers found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Platform Analytics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{filteredCustomers.length + allWorkers.length}</div>
                    <div className="text-gray-600 font-medium">Total Users</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {allWorkers.reduce((acc, worker) => acc + (worker.jobsCompleted || 0), 0)}
                    </div>
                    <div className="text-gray-600 font-medium">Total Jobs Completed</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {((allWorkers.reduce((acc, worker) => acc + (worker.rating || 0), 0) / allWorkers.length) || 0).toFixed(1)}
                    </div>
                    <div className="text-gray-600 font-medium">Average Rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Admin Settings</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Platform Configuration</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600">Platform settings and configurations would be managed here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanelStandalone;