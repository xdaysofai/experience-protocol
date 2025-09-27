"use client";
import { useState } from 'react';
import { createPublicClient, createWalletClient, custom, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { getInjectedProvider } from '../../lib/provider';

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC || 'https://ethereum-sepolia-rpc.publicnode.com'),
});

const factoryAbi = [
  {
    "type": "function",
    "name": "createExperience",
    "inputs": [
      {"name": "creator", "type": "address"},
      {"name": "cidInitial", "type": "string"},
      {"name": "flowSyncAuthority", "type": "address"},
      {"name": "proposerFeeBps", "type": "uint16"}
    ],
    "outputs": [{"name": "experience", "type": "address"}],
    "stateMutability": "nonpayable"
  }
] as const;

interface Hotel {
  name: string;
  address?: string;
  phoneNumber?: string;
  geoLocation?: { lat: string; lng: string };
  priceRange?: string;
  amenities?: string[];
}

interface Shopping {
  name: string;
  category: 'clothes' | 'art' | 'crafts' | 'souvenirs' | 'electronics' | 'books' | 'other';
  address?: string;
  description?: string;
  priceRange?: string;
}

interface Food {
  name: string;
  cuisine: 'street' | 'local' | 'international' | 'fine-dining' | 'cafe' | 'other';
  dietaryType: 'veg' | 'non-veg' | 'vegan' | 'mixed';
  address?: string;
  specialties?: string[];
  priceRange?: string;
}

interface Transport {
  type: 'walking' | 'taxi' | 'bus' | 'train' | 'metro' | 'bike' | 'car' | 'boat' | 'flight' | 'other';
  description: string;
  fromLocation?: string;
  toLocation?: string;
  estimatedCost?: string;
  estimatedTime?: string;
  bookingInfo?: string;
}

interface ExperienceData {
  title: string;
  description: string;
  location: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  category: 'cultural' | 'adventure' | 'relaxation' | 'culinary' | 'nightlife' | 'nature' | 'shopping' | 'other';
  pricePerPass: string;
  maxParticipants?: string;
  hotels: Hotel[];
  shopping: Shopping[];
  food: Food[];
  transport: Transport[];
  additionalNotes?: string;
}

export default function CreateExperience() {
  const [account, setAccount] = useState<string>('');
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  const [experienceData, setExperienceData] = useState<ExperienceData>({
    title: '',
    description: '',
    location: '',
    duration: '',
    difficulty: 'moderate',
    category: 'cultural',
    pricePerPass: '0.01',
    hotels: [],
    shopping: [],
    food: [],
    transport: [],
  });

  const steps = [
    'Basic Info',
    'Hotels & Accommodation', 
    'Shopping & Shopping',
    'Food & Dining',
    'Transport & Logistics',
    'Review & Deploy'
  ];

  async function connectWallet() {
    try {
      setLoading('Connecting...');
      const provider = await getInjectedProvider();
      if (!provider) throw new Error('No wallet found');
      
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setError('');
    } catch (err: any) {
      setError('Failed to connect wallet: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  function addHotel() {
    setExperienceData(prev => ({
      ...prev,
      hotels: [...prev.hotels, { name: '', amenities: [] }]
    }));
  }

  function updateHotel(index: number, field: keyof Hotel, value: any) {
    setExperienceData(prev => ({
      ...prev,
      hotels: prev.hotels.map((hotel, i) => 
        i === index ? { ...hotel, [field]: value } : hotel
      )
    }));
  }

  function removeHotel(index: number) {
    setExperienceData(prev => ({
      ...prev,
      hotels: prev.hotels.filter((_, i) => i !== index)
    }));
  }

  function addShopping() {
    setExperienceData(prev => ({
      ...prev,
      shopping: [...prev.shopping, { name: '', category: 'other' }]
    }));
  }

  function updateShopping(index: number, field: keyof Shopping, value: any) {
    setExperienceData(prev => ({
      ...prev,
      shopping: prev.shopping.map((shop, i) => 
        i === index ? { ...shop, [field]: value } : shop
      )
    }));
  }

  function removeShopping(index: number) {
    setExperienceData(prev => ({
      ...prev,
      shopping: prev.shopping.filter((_, i) => i !== index)
    }));
  }

  function addFood() {
    setExperienceData(prev => ({
      ...prev,
      food: [...prev.food, { name: '', cuisine: 'local', dietaryType: 'mixed', specialties: [] }]
    }));
  }

  function updateFood(index: number, field: keyof Food, value: any) {
    setExperienceData(prev => ({
      ...prev,
      food: prev.food.map((food, i) => 
        i === index ? { ...food, [field]: value } : food
      )
    }));
  }

  function removeFood(index: number) {
    setExperienceData(prev => ({
      ...prev,
      food: prev.food.filter((_, i) => i !== index)
    }));
  }

  function addTransport() {
    setExperienceData(prev => ({
      ...prev,
      transport: [...prev.transport, { type: 'walking', description: '' }]
    }));
  }

  function updateTransport(index: number, field: keyof Transport, value: any) {
    setExperienceData(prev => ({
      ...prev,
      transport: prev.transport.map((transport, i) => 
        i === index ? { ...transport, [field]: value } : transport
      )
    }));
  }

  function removeTransport(index: number) {
    setExperienceData(prev => ({
      ...prev,
      transport: prev.transport.filter((_, i) => i !== index)
    }));
  }

  async function deployExperience() {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setLoading('Creating experience on blockchain...');
      
      // Create IPFS-like content ID (in production, upload to actual IPFS)
      const contentData = {
        ...experienceData,
        createdAt: new Date().toISOString(),
        creator: account
      };
      
      const cidInitial = `ipfs://experience-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('Experience data to be stored:', contentData);
      console.log('Generated CID:', cidInitial);

      const provider = await getInjectedProvider();
      const walletClient = createWalletClient({ 
        chain: sepolia, 
        transport: custom(provider) 
      });

      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
      if (!factoryAddress) {
        throw new Error('Factory address not configured');
      }

      // Deploy new experience contract
      const { request } = await publicClient.simulateContract({
        address: factoryAddress,
        abi: factoryAbi,
        functionName: 'createExperience',
        args: [
          account as `0x${string}`,  // creator
          cidInitial,                // cidInitial  
          account as `0x${string}`,  // flowSyncAuthority
          1000                       // proposerFeeBps (10%)
        ],
        account: account as `0x${string}`,
      });

      const hash = await walletClient.writeContract(request);
      
      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Experience created! Transaction:', receipt);
      
      // Extract experience address from logs (you might need to parse this properly)
      setSuccess(`Experience created successfully! Transaction: ${hash}`);
      
      // Reset form
      setCurrentStep(0);
      setExperienceData({
        title: '',
        description: '',
        location: '',
        duration: '',
        difficulty: 'moderate',
        category: 'cultural',
        pricePerPass: '0.01',
        hotels: [],
        shopping: [],
        food: [],
        transport: [],
      });

    } catch (err: any) {
      console.error('Deploy error:', err);
      setError('Failed to create experience: ' + err.message);
    } finally {
      setLoading('');
    }
  }

  const renderBasicInfo = () => (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Experience Title *
        </label>
        <input
          type="text"
          value={experienceData.title}
          onChange={(e) => setExperienceData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Hidden Gems of Tokyo's Street Food Scene"
          style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Description *
        </label>
        <textarea
          value={experienceData.description}
          onChange={(e) => setExperienceData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your travel experience in detail..."
          rows={4}
          style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Location *
          </label>
          <input
            type="text"
            value={experienceData.location}
            onChange={(e) => setExperienceData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., Tokyo, Japan"
            style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Duration *
          </label>
          <input
            type="text"
            value={experienceData.duration}
            onChange={(e) => setExperienceData(prev => ({ ...prev, duration: e.target.value }))}
            placeholder="e.g., 3 days, 1 week"
            style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Difficulty Level
          </label>
          <select
            value={experienceData.difficulty}
            onChange={(e) => setExperienceData(prev => ({ ...prev, difficulty: e.target.value as any }))}
            style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          >
            <option value="easy">Easy - Relaxed pace</option>
            <option value="moderate">Moderate - Some walking</option>
            <option value="challenging">Challenging - Active adventure</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Category
          </label>
          <select
            value={experienceData.category}
            onChange={(e) => setExperienceData(prev => ({ ...prev, category: e.target.value as any }))}
            style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          >
            <option value="cultural">Cultural</option>
            <option value="adventure">Adventure</option>
            <option value="relaxation">Relaxation</option>
            <option value="culinary">Culinary</option>
            <option value="nightlife">Nightlife</option>
            <option value="nature">Nature</option>
            <option value="shopping">Shopping</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Price per Pass (ETH) *
          </label>
          <input
            type="number"
            step="0.001"
            value={experienceData.pricePerPass}
            onChange={(e) => setExperienceData(prev => ({ ...prev, pricePerPass: e.target.value }))}
            style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Max Participants (optional)
        </label>
        <input
          type="number"
          value={experienceData.maxParticipants || ''}
          onChange={(e) => setExperienceData(prev => ({ ...prev, maxParticipants: e.target.value }))}
          placeholder="e.g., 10"
          style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
        />
      </div>
    </div>
  );

  const renderHotels = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Hotels & Accommodation</h3>
        <button 
          onClick={addHotel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Add Hotel
        </button>
      </div>

      {experienceData.hotels.map((hotel, index) => (
        <div key={index} style={{
          padding: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Hotel #{index + 1}</h4>
            <button 
              onClick={() => removeHotel(index)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Hotel Name *
              </label>
              <input
                type="text"
                value={hotel.name}
                onChange={(e) => updateHotel(index, 'name', e.target.value)}
                placeholder="e.g., Shibuya Excel Hotel"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Address (optional)
              </label>
              <input
                type="text"
                value={hotel.address || ''}
                onChange={(e) => updateHotel(index, 'address', e.target.value)}
                placeholder="e.g., 1-12-2 Dogenzaka, Shibuya, Tokyo"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Phone Number (optional)
                </label>
                <input
                  type="text"
                  value={hotel.phoneNumber || ''}
                  onChange={(e) => updateHotel(index, 'phoneNumber', e.target.value)}
                  placeholder="e.g., +81 3-5457-0109"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Price Range (optional)
                </label>
                <input
                  type="text"
                  value={hotel.priceRange || ''}
                  onChange={(e) => updateHotel(index, 'priceRange', e.target.value)}
                  placeholder="e.g., $100-200/night"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Latitude (optional)
                </label>
                <input
                  type="text"
                  value={hotel.geoLocation?.lat || ''}
                  onChange={(e) => updateHotel(index, 'geoLocation', { 
                    ...hotel.geoLocation, 
                    lat: e.target.value 
                  })}
                  placeholder="e.g., 35.6584"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Longitude (optional)
                </label>
                <input
                  type="text"
                  value={hotel.geoLocation?.lng || ''}
                  onChange={(e) => updateHotel(index, 'geoLocation', { 
                    ...hotel.geoLocation, 
                    lng: e.target.value 
                  })}
                  placeholder="e.g., 139.7016"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Amenities (optional)
              </label>
              <input
                type="text"
                value={hotel.amenities?.join(', ') || ''}
                onChange={(e) => updateHotel(index, 'amenities', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="e.g., WiFi, Gym, Pool, Restaurant"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
              <small style={{ color: '#6b7280' }}>Separate multiple amenities with commas</small>
            </div>
          </div>
        </div>
      ))}

      {experienceData.hotels.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏨</div>
          <p>No hotels added yet. Click "Add Hotel" to recommend accommodation.</p>
        </div>
      )}
    </div>
  );

  // Similar render functions for shopping, food, and transport would go here...
  // For brevity, I'll include just the shopping one and indicate where others would go

  const renderShopping = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Shopping & Local Markets</h3>
        <button 
          onClick={addShopping}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Add Shopping Spot
        </button>
      </div>

      {experienceData.shopping.map((shop, index) => (
        <div key={index} style={{
          padding: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Shopping Spot #{index + 1}</h4>
            <button 
              onClick={() => removeShopping(index)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Shop/Market Name *
              </label>
              <input
                type="text"
                value={shop.name}
                onChange={(e) => updateShopping(index, 'name', e.target.value)}
                placeholder="e.g., Tsukiji Outer Market, Shibuya 109"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Category
                </label>
                <select
                  value={shop.category}
                  onChange={(e) => updateShopping(index, 'category', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <option value="clothes">Clothes & Fashion</option>
                  <option value="art">Art & Galleries</option>
                  <option value="crafts">Local Crafts</option>
                  <option value="souvenirs">Souvenirs</option>
                  <option value="electronics">Electronics</option>
                  <option value="books">Books & Media</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Price Range (optional)
                </label>
                <input
                  type="text"
                  value={shop.priceRange || ''}
                  onChange={(e) => updateShopping(index, 'priceRange', e.target.value)}
                  placeholder="e.g., $10-100, Budget-friendly"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Address (optional)
              </label>
              <input
                type="text"
                value={shop.address || ''}
                onChange={(e) => updateShopping(index, 'address', e.target.value)}
                placeholder="e.g., 5-2-1 Tsukiji, Chuo City, Tokyo"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Description (optional)
              </label>
              <textarea
                value={shop.description || ''}
                onChange={(e) => updateShopping(index, 'description', e.target.value)}
                placeholder="What makes this place special? What can you find here?"
                rows={2}
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      ))}

      {experienceData.shopping.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛍️</div>
          <p>No shopping spots added yet. Click "Add Shopping Spot" to recommend places to shop.</p>
        </div>
      )}
    </div>
  );

  // Continue in next part...
  const renderFood = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Food & Dining</h3>
        <button 
          onClick={addFood}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Add Restaurant/Food
        </button>
      </div>

      {experienceData.food.map((food, index) => (
        <div key={index} style={{
          padding: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Food Spot #{index + 1}</h4>
            <button 
              onClick={() => removeFood(index)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Restaurant/Food Name *
              </label>
              <input
                type="text"
                value={food.name}
                onChange={(e) => updateFood(index, 'name', e.target.value)}
                placeholder="e.g., Ramen Yokocho, Tsukiji Fish Market"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Cuisine Type
                </label>
                <select
                  value={food.cuisine}
                  onChange={(e) => updateFood(index, 'cuisine', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <option value="street">Street Food</option>
                  <option value="local">Local Cuisine</option>
                  <option value="international">International</option>
                  <option value="fine-dining">Fine Dining</option>
                  <option value="cafe">Cafe/Coffee</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Dietary Type
                </label>
                <select
                  value={food.dietaryType}
                  onChange={(e) => updateFood(index, 'dietaryType', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <option value="mixed">Mixed (Veg & Non-Veg)</option>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                  <option value="vegan">Vegan</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Price Range (optional)
                </label>
                <input
                  type="text"
                  value={food.priceRange || ''}
                  onChange={(e) => updateFood(index, 'priceRange', e.target.value)}
                  placeholder="e.g., $5-15, Budget"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Address (optional)
              </label>
              <input
                type="text"
                value={food.address || ''}
                onChange={(e) => updateFood(index, 'address', e.target.value)}
                placeholder="e.g., 4-10-16 Tsukiji, Chuo City, Tokyo"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Specialties (optional)
              </label>
              <input
                type="text"
                value={food.specialties?.join(', ') || ''}
                onChange={(e) => updateFood(index, 'specialties', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                placeholder="e.g., Tuna sashimi, Ramen, Fresh sushi"
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
              <small style={{ color: '#6b7280' }}>Separate multiple specialties with commas</small>
            </div>
          </div>
        </div>
      ))}

      {experienceData.food.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🍜</div>
          <p>No food spots added yet. Click "Add Restaurant/Food" to recommend dining experiences.</p>
        </div>
      )}
    </div>
  );

  const renderTransport = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Transport & Getting Around</h3>
        <button 
          onClick={addTransport}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          + Add Transport Option
        </button>
      </div>

      {experienceData.transport.map((transport, index) => (
        <div key={index} style={{
          padding: '20px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Transport Option #{index + 1}</h4>
            <button 
              onClick={() => removeTransport(index)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Transport Type
                </label>
                <select
                  value={transport.type}
                  onChange={(e) => updateTransport(index, 'type', e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                >
                  <option value="walking">Walking</option>
                  <option value="taxi">Taxi/Rideshare</option>
                  <option value="bus">Bus</option>
                  <option value="train">Train</option>
                  <option value="metro">Metro/Subway</option>
                  <option value="bike">Bike/Cycling</option>
                  <option value="car">Car/Rental</option>
                  <option value="boat">Boat/Ferry</option>
                  <option value="flight">Flight</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Description *
                </label>
                <input
                  type="text"
                  value={transport.description}
                  onChange={(e) => updateTransport(index, 'description', e.target.value)}
                  placeholder="e.g., Take JR Yamanote Line from Shinjuku to Shibuya"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  From Location (optional)
                </label>
                <input
                  type="text"
                  value={transport.fromLocation || ''}
                  onChange={(e) => updateTransport(index, 'fromLocation', e.target.value)}
                  placeholder="e.g., Shinjuku Station"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  To Location (optional)
                </label>
                <input
                  type="text"
                  value={transport.toLocation || ''}
                  onChange={(e) => updateTransport(index, 'toLocation', e.target.value)}
                  placeholder="e.g., Shibuya Station"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Estimated Cost (optional)
                </label>
                <input
                  type="text"
                  value={transport.estimatedCost || ''}
                  onChange={(e) => updateTransport(index, 'estimatedCost', e.target.value)}
                  placeholder="e.g., ¥160, $15-20"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Estimated Time (optional)
                </label>
                <input
                  type="text"
                  value={transport.estimatedTime || ''}
                  onChange={(e) => updateTransport(index, 'estimatedTime', e.target.value)}
                  placeholder="e.g., 7 minutes, 30-45 mins"
                  style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Booking/Additional Info (optional)
              </label>
              <textarea
                value={transport.bookingInfo || ''}
                onChange={(e) => updateTransport(index, 'bookingInfo', e.target.value)}
                placeholder="e.g., Book via JR Pass, Download Uber app, Buy IC card at station"
                rows={2}
                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      ))}

      {experienceData.transport.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#6b7280',
          border: '2px dashed #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚇</div>
          <p>No transport options added yet. Click "Add Transport Option" to help travelers get around.</p>
        </div>
      )}
    </div>
  );

  const renderReview = () => (
    <div>
      <h3 style={{ marginBottom: '20px' }}>Review & Deploy Experience</h3>
      
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Basic Information</h4>
        <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
          <div><strong>Title:</strong> {experienceData.title}</div>
          <div><strong>Location:</strong> {experienceData.location}</div>
          <div><strong>Duration:</strong> {experienceData.duration}</div>
          <div><strong>Price:</strong> {experienceData.pricePerPass} ETH</div>
          <div><strong>Category:</strong> {experienceData.category}</div>
          <div><strong>Difficulty:</strong> {experienceData.difficulty}</div>
          {experienceData.maxParticipants && (
            <div><strong>Max Participants:</strong> {experienceData.maxParticipants}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#15803d' }}>🏨 Hotels: {experienceData.hotels.length}</h5>
          {experienceData.hotels.map((hotel, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#166534' }}>• {hotel.name}</div>
          ))}
        </div>

        <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#d97706' }}>🛍️ Shopping: {experienceData.shopping.length}</h5>
          {experienceData.shopping.map((shop, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#92400e' }}>• {shop.name}</div>
          ))}
        </div>

        <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px' }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>🍜 Food: {experienceData.food.length}</h5>
          {experienceData.food.map((food, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#991b1b' }}>• {food.name}</div>
          ))}
        </div>

        <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px' }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#2563eb' }}>🚇 Transport: {experienceData.transport.length}</h5>
          {experienceData.transport.map((transport, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#1d4ed8' }}>• {transport.type}: {transport.description}</div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Additional Notes (optional)
        </label>
        <textarea
          value={experienceData.additionalNotes || ''}
          onChange={(e) => setExperienceData(prev => ({ ...prev, additionalNotes: e.target.value }))}
          placeholder="Any additional tips, warnings, or special instructions for travelers..."
          rows={4}
          style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
        />
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#d97706' }}>⚠️ Before Deploying</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
          <li>Make sure all required fields are filled</li>
          <li>Double-check your experience details</li>
          <li>Ensure you're connected to Sepolia testnet</li>
          <li>This will create a new smart contract on the blockchain</li>
          <li>You'll need to confirm the transaction in your wallet</li>
        </ul>
      </div>
    </div>
  );

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return experienceData.title && experienceData.description && 
               experienceData.location && experienceData.duration && 
               experienceData.pricePerPass;
      case 1:
      case 2:
      case 3:
      case 4:
        return true; // Optional sections
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px', fontWeight: '600' }}>
            🌍 Create Travel Experience
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>
            Build and deploy your travel & lifestyle experience on the blockchain
          </p>
        </div>
        
        {/* Wallet Status */}
        <div>
          {account ? (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              🟢 {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              disabled={loading !== ''}
              style={{
                padding: '12px 24px',
                backgroundColor: loading !== '' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: loading !== '' ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading || 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Progress Steps */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {steps.map((step, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center',
                flex: 1,
                position: 'relative'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: index <= currentStep ? '#10b981' : '#e5e7eb',
                  color: index <= currentStep ? 'white' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  zIndex: 1
                }}>
                  {index + 1}
                </div>
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: index <= currentStep ? '#10b981' : '#6b7280',
                  fontWeight: index === currentStep ? '600' : '400'
                }}>
                  {step}
                </span>
                {index < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '40px',
                    right: '-50%',
                    height: '2px',
                    backgroundColor: index < currentStep ? '#10b981' : '#e5e7eb',
                    zIndex: 0
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          {currentStep === 0 && renderBasicInfo()}
          {currentStep === 1 && renderHotels()}
          {currentStep === 2 && renderShopping()}
          {currentStep === 3 && renderFood()}
          {currentStep === 4 && renderTransport()}
          {currentStep === 5 && renderReview()}
        </div>

        {/* Navigation */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: currentStep === 0 ? '#f3f4f6' : '#6b7280',
              color: currentStep === 0 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            ← Previous
          </button>

          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Step {currentStep + 1} of {steps.length}
          </div>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              disabled={!canProceed()}
              style={{
                padding: '12px 24px',
                backgroundColor: !canProceed() ? '#f3f4f6' : '#10b981',
                color: !canProceed() ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: !canProceed() ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={deployExperience}
              disabled={!account || loading !== '' || !canProceed()}
              style={{
                padding: '12px 24px',
                backgroundColor: (!account || loading !== '' || !canProceed()) ? '#f3f4f6' : '#dc2626',
                color: (!account || loading !== '' || !canProceed()) ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: (!account || loading !== '' || !canProceed()) ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              {loading || '🚀 Deploy Experience to Blockchain'}
            </button>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            borderRadius: '8px',
            fontWeight: '500'
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#16a34a',
            borderRadius: '8px',
            fontWeight: '500'
          }}>
            ✅ {success}
          </div>
        )}
      </div>
    </div>
  );
}
