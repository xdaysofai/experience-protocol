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

interface ExperienceItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  priceRange?: string;
  duration?: string;
  difficulty?: 'easy' | 'moderate' | 'hard';
  ageRestriction?: string;
  groupSize?: string;
  bookingRequired?: boolean;
  operatingHours?: string;
  seasonality?: string;
  specialRequirements?: string;
  geoLocation?: { lat: string; lng: string };
  images?: string[];
  tags?: string[];
}

interface ExperienceData {
  title: string;
  description: string;
  location: string;
  duration: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  pricePerPass: string;
  maxParticipants?: string;
  items: ExperienceItem[];
  additionalNotes?: string;
  categories: string[];
}

const EXPERIENCE_CATEGORIES = [
  'Attraction Tickets',
  'Tours', 
  'Adventure',
  'Water Activities',
  'Cruises',
  'Nature & Wildlife',
  'Entertainment & Shows',
  'Transportation',
  'Food & Drink',
  'Aerial Sightseeing',
  'Travel Services',
  'Wellness'
];

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
    pricePerPass: '0.01',
    items: [],
    categories: [],
  });

  const steps = [
    'Basic Info',
    'Choose Categories',
    'Add Experience Items',
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

  function toggleCategory(category: string) {
    setExperienceData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  }

  function addExperienceItem(category: string) {
    const newItem: ExperienceItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category,
      name: '',
      tags: []
    };
    
    setExperienceData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  }

  function updateExperienceItem(id: string, field: keyof ExperienceItem, value: any) {
    setExperienceData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  }

  function removeExperienceItem(id: string) {
    setExperienceData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
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
        pricePerPass: '0.01',
        items: [],
        categories: [],
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
          placeholder="e.g., Top 10 Luxury Hotels in Bali, Best Street Food Tour Bangkok"
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
          placeholder="Describe your experience package. Mix categories like attractions + food + transport for a complete experience..."
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
            placeholder="e.g., Bali, Indonesia or Multiple Locations"
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
            placeholder="e.g., 2 hours, Full day, 3 days"
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
            <option value="easy">Easy - Anyone can enjoy</option>
            <option value="moderate">Moderate - Some requirements</option>
            <option value="challenging">Challenging - High difficulty</option>
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
    </div>
  );

  const renderCategories = () => (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Choose Experience Categories</h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
          Select the types of experiences you want to include. You can mix multiple categories like Hotels + Food + Tours.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {EXPERIENCE_CATEGORIES.map((category) => {
          const isSelected = experienceData.categories.includes(category);
          const icons: { [key: string]: string } = {
            'Attraction Tickets': '🎫',
            'Tours': '🗺️', 
            'Adventure': '🏔️',
            'Water Activities': '🏊',
            'Cruises': '🚢',
            'Nature & Wildlife': '🌿',
            'Entertainment & Shows': '🎭',
            'Transportation': '🚗',
            'Food & Drink': '🍽️',
            'Aerial Sightseeing': '🚁',
            'Travel Services': '🧳',
            'Wellness': '🧘'
          };
          
          return (
            <div
              key={category}
              onClick={() => toggleCategory(category)}
              style={{
                padding: '20px',
                border: isSelected ? '2px solid #10b981' : '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: isSelected ? '#f0fdf4' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {icons[category] || '📍'}
              </div>
              <div style={{ 
                fontWeight: '600', 
                color: isSelected ? '#15803d' : '#374151',
                fontSize: '16px'
              }}>
                {category}
              </div>
              {isSelected && (
                <div style={{ 
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#16a34a',
                  fontWeight: '500'
                }}>
                  ✓ Selected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {experienceData.categories.length > 0 && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#15803d' }}>Selected Categories:</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {experienceData.categories.map(category => (
              <span key={category} style={{
                padding: '4px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {category}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderItems = () => {
    const groupedItems = experienceData.categories.reduce((acc, category) => {
      acc[category] = experienceData.items.filter(item => item.category === category);
      return acc;
    }, {} as { [key: string]: ExperienceItem[] });

    if (experienceData.categories.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280',
          border: '2px dashed #e5e7eb',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Categories Selected</h3>
          <p style={{ margin: 0 }}>Please go back and select at least one category first.</p>
        </div>
      );
    }

    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Add Experience Items</h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Add specific items for each selected category. All fields except name are optional.
          </p>
        </div>

        {experienceData.categories.map(category => (
          <div key={category} style={{
            marginBottom: '32px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            backgroundColor: '#fafbfc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h4 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>
                {category} ({groupedItems[category]?.length || 0} items)
              </h4>
              <button
                onClick={() => addExperienceItem(category)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                + Add {category}
              </button>
            </div>

            {groupedItems[category]?.map((item) => (
              <div key={item.id} style={{
                padding: '20px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '16px',
                backgroundColor: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h5 style={{ margin: 0, color: '#374151' }}>Item Details</h5>
                  <button
                    onClick={() => removeExperienceItem(item.id)}
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
                  {/* Name - Required */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateExperienceItem(item.id, 'name', e.target.value)}
                      placeholder={`e.g., ${category === 'Food & Drink' ? 'Michelin Star Restaurant' : category === 'Adventure' ? 'Bungee Jumping Experience' : category === 'Tours' ? 'Historical Walking Tour' : 'Amazing Experience'}`}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                      Description (optional)
                    </label>
                    <textarea
                      value={item.description || ''}
                      onChange={(e) => updateExperienceItem(item.id, 'description', e.target.value)}
                      placeholder="Describe what makes this special..."
                      rows={2}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                  </div>

                  {/* Address and Contact */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Address (optional)
                      </label>
                      <input
                        type="text"
                        value={item.address || ''}
                        onChange={(e) => updateExperienceItem(item.id, 'address', e.target.value)}
                        placeholder="Street address or location"
                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Phone (optional)
                      </label>
                      <input
                        type="text"
                        value={item.phoneNumber || ''}
                        onChange={(e) => updateExperienceItem(item.id, 'phoneNumber', e.target.value)}
                        placeholder="Contact number"
                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Price, Duration, Website */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Price Range (optional)
                      </label>
                      <input
                        type="text"
                        value={item.priceRange || ''}
                        onChange={(e) => updateExperienceItem(item.id, 'priceRange', e.target.value)}
                        placeholder="e.g., $50-100"
                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Duration (optional)
                      </label>
                      <input
                        type="text"
                        value={item.duration || ''}
                        onChange={(e) => updateExperienceItem(item.id, 'duration', e.target.value)}
                        placeholder="e.g., 2 hours"
                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Website (optional)
                      </label>
                      <input
                        type="text"
                        value={item.website || ''}
                        onChange={(e) => updateExperienceItem(item.id, 'website', e.target.value)}
                        placeholder="https://..."
                        style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  {/* Expandable Advanced Options */}
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', color: '#6366f1', fontWeight: '500' }}>
                      Advanced Options (optional)
                    </summary>
                    <div style={{ marginTop: '16px', display: 'grid', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Difficulty
                          </label>
                          <select
                            value={item.difficulty || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'difficulty', e.target.value)}
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          >
                            <option value="">Not specified</option>
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Age Restriction
                          </label>
                          <input
                            type="text"
                            value={item.ageRestriction || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'ageRestriction', e.target.value)}
                            placeholder="e.g., 18+, Family friendly"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Group Size
                          </label>
                          <input
                            type="text"
                            value={item.groupSize || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'groupSize', e.target.value)}
                            placeholder="e.g., Max 10 people"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Operating Hours
                          </label>
                          <input
                            type="text"
                            value={item.operatingHours || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'operatingHours', e.target.value)}
                            placeholder="e.g., 9am-5pm daily"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Seasonality
                          </label>
                          <input
                            type="text"
                            value={item.seasonality || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'seasonality', e.target.value)}
                            placeholder="e.g., Year-round, Summer only"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                          Special Requirements
                        </label>
                        <input
                          type="text"
                          value={item.specialRequirements || ''}
                          onChange={(e) => updateExperienceItem(item.id, 'specialRequirements', e.target.value)}
                          placeholder="e.g., Bring ID, Advance booking required"
                          style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Latitude
                          </label>
                          <input
                            type="text"
                            value={item.geoLocation?.lat || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'geoLocation', { 
                              ...item.geoLocation, 
                              lat: e.target.value 
                            })}
                            placeholder="e.g., 35.6584"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                            Longitude
                          </label>
                          <input
                            type="text"
                            value={item.geoLocation?.lng || ''}
                            onChange={(e) => updateExperienceItem(item.id, 'geoLocation', { 
                              ...item.geoLocation, 
                              lng: e.target.value 
                            })}
                            placeholder="e.g., 139.7016"
                            style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={item.bookingRequired || false}
                            onChange={(e) => updateExperienceItem(item.id, 'bookingRequired', e.target.checked)}
                          />
                          Advance booking required
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                          Tags (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={item.tags?.join(', ') || ''}
                          onChange={(e) => updateExperienceItem(item.id, 'tags', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="e.g., romantic, family-friendly, luxury"
                          style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ))}

            {(!groupedItems[category] || groupedItems[category].length === 0) && (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                color: '#6b7280',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                <p style={{ margin: 0, fontSize: '14px' }}>No {category.toLowerCase()} added yet. Click "Add {category}" to get started.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };


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
          <div><strong>Difficulty:</strong> {experienceData.difficulty}</div>
          {experienceData.maxParticipants && (
            <div><strong>Max Participants:</strong> {experienceData.maxParticipants}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>Categories & Items Summary</h4>
        <div style={{ display: 'grid', gap: '16px' }}>
          {experienceData.categories.map(category => {
            const categoryItems = experienceData.items.filter(item => item.category === category);
            return (
              <div key={category} style={{ 
                padding: '16px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#15803d' }}>
                  {category} ({categoryItems.length} items)
                </h5>
                {categoryItems.map((item, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#166534', marginBottom: '2px' }}>
                    • {item.name}
                    {item.priceRange && ` (${item.priceRange})`}
                    {item.duration && ` - ${item.duration}`}
                  </div>
                ))}
                {categoryItems.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                    No items added for this category
                  </div>
                )}
              </div>
            );
          })}
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

      <div style={{
        padding: '16px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>💡 Experience Summary</h4>
        <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
          Total: {experienceData.categories.length} categories, {experienceData.items.length} items
        </p>
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
        return experienceData.categories.length > 0;
      case 2:
        return true; // Items are optional
      case 3:
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
          {currentStep === 1 && renderCategories()}
          {currentStep === 2 && renderItems()}
          {currentStep === 3 && renderReview()}
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
