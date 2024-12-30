import React from "react";
import { StyleSheet, ScrollView, TouchableOpacity, View } from "react-native";
import { Layout, Text, Card, Spinner, TopNavigation } from "@ui-kitten/components";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../provider/auth";
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFrappe } from "../provider/backend";

const formatDate = (date) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName}, ${day} ${month} ${year}`;
};

const StatCard = ({ title, value, loading, iconName }) => (
  <Card style={styles.statCard}>
    <Layout style={styles.statContent}>
      <Layout style={styles.iconContainer}>
        <MaterialCommunityIcons name={iconName} size={24} color="#8F9BB3" />
        <Text appearance="hint">{title}</Text>
      </Layout>
      {loading ? (
        <Spinner size="small" />
      ) : (
        <Text category="h5">{value}</Text>
      )}
    </Layout>
  </Card>
);

export const HomeScreen = ({ navigation }) => {
  const { accessToken, refreshAccessTokenAsync } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    itemCount: 0,
    groupCount: 0,
    uomCount: 0,
    warehouseCount: 0,
    stockEntries: [],
    latestEntries: [],
    totalStockEntries: 0,
    lowStockItems: []
  });
  const { db, call } = useFrappe();
  const currentDate = formatDate(new Date());

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get current month's date filter
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;

      // Get counts for all doctypes
      const [itemCount, groupCount, uomCount, warehouseCount] = await Promise.all([
        db.getCount("Item", []),
        db.getCount("Item Group", []),
        db.getCount("UOM", []),
        db.getCount("Warehouse", [])
      ]);

      try {
        console.log('Fetching low stock items...');
        const lowStockResponse = await call.get('get_low_stock_items');
        console.log('Low stock response:', JSON.stringify(lowStockResponse, null, 2));

        // Get stock entries for current month
        const [monthlyEntries, latestEntries] = await Promise.all([
          db.getDocList("Stock Entry", {
            fields: ["name", "stock_entry_type", "posting_date"],
            filters: [["posting_date", ">=", monthStart]],
            limit: 1000,
            orderBy: {
              field: "posting_date",
              order: "desc"
            }
          }),
          db.getDocList("Stock Entry", {
            fields: ["name", "stock_entry_type", "posting_date", "modified"],
            filters: [],
            limit: 5,
            orderBy: {
              field: "modified",
              order: "desc"
            }
          })
        ]);
        
        // Handle both cases where data might be in .message or directly in the response
        const monthlyEntriesList = Array.isArray(monthlyEntries) ? monthlyEntries : 
                                 (monthlyEntries?.message || []);
        const latestEntriesList = Array.isArray(latestEntries) ? latestEntries : 
                                 (latestEntries?.message || []);
        const lowStockItems = lowStockResponse?.message?.data || [];
        
        console.log('Monthly entries:', monthlyEntriesList.length);
        console.log('Latest entries:', latestEntriesList.length);
        console.log('Low stock items:', lowStockItems);
        
        // Count entries by type
        const stockEntryTypes = monthlyEntriesList.reduce((acc, entry) => {
          if (entry.stock_entry_type) {
            acc[entry.stock_entry_type] = (acc[entry.stock_entry_type] || 0) + 1;
          }
          return acc;
        }, {});

        setStats({
          itemCount,
          groupCount,
          uomCount,
          warehouseCount,
          stockEntries: Object.entries(stockEntryTypes),
          latestEntries: latestEntriesList,
          totalStockEntries: monthlyEntriesList.length,
          lowStockItems
        });
      } catch (stockError) {
        console.error('Error fetching stock entries:', stockError);
        console.error('Error details:', JSON.stringify(stockError, null, 2));
        setStats({
          itemCount,
          groupCount,
          uomCount,
          warehouseCount,
          stockEntries: [],
          latestEntries: [],
          totalStockEntries: 0,
          lowStockItems: []
        });
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.httpStatus === 403 || error.httpStatus === 401) {
        await refreshAccessTokenAsync();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message,
          position: 'top'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopNavigation
        title={evaProps => <Text {...evaProps} style={styles.titleText}>Dashboard</Text>}
        alignment="start"
        style={styles.topNav}
      />

      <ScrollView style={styles.scrollView}>
        <Layout style={styles.contentContainer}>
          <Card style={styles.dateCard}>
            <Layout style={styles.dateContainer}>
              <Text category="s1">{currentDate}</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Detail')}
              >
                <MaterialCommunityIcons name="account-circle" size={24} color="#8F9BB3" />
              </TouchableOpacity>
            </Layout>
          </Card>
          
          <Layout style={styles.statsGrid}>
            <StatCard 
              title="Total Items"
              value={stats.itemCount}
              loading={loading}
              iconName="cube-outline"
            />
            <StatCard 
              title="Item Groups"
              value={stats.groupCount}
              loading={loading}
              iconName="folder-outline"
            />
            <StatCard 
              title="UOMs"
              value={stats.uomCount}
              loading={loading}
              iconName="pound"
            />
            <StatCard 
              title="Warehouses"
              value={stats.warehouseCount}
              loading={loading}
              iconName="home-outline"
            />
          </Layout>

          <Card style={styles.stockEntriesCard}>
            <Layout style={styles.stockEntriesHeader}>
              <Layout style={styles.headerLeft}>
                <MaterialCommunityIcons 
                  name="transfer"
                  size={20}
                  color="#8F9BB3"
                  style={styles.stockEntriesIcon}
                />
                <Text category="h6" style={styles.headerTitle}>Stock Entries</Text>
                <Text category="s1" appearance="hint" style={styles.headerSubtitle}>
                  (Desember 2024)
                </Text>
              </Layout>
              <Text category="s1" appearance="hint">
                Total: {stats.totalStockEntries}
              </Text>
            </Layout>
            {stats.stockEntries.length > 0 ? (
              stats.stockEntries.map(([type, count]) => (
                <Layout key={type} style={styles.stockEntryItem}>
                  <Layout style={styles.stockEntryType}>
                    <MaterialCommunityIcons 
                      name="arrow-right"
                      size={20}
                      color="#8F9BB3"
                    />
                    <Text>{type}</Text>
                  </Layout>
                  <Text>{count}</Text>
                </Layout>
              ))
            ) : (
              <Text appearance="hint" style={styles.emptyText}>No stock entries this month</Text>
            )}
          </Card>

          <Card style={styles.latestEntriesCard}>
            <Layout style={styles.stockEntriesHeader}>
              <Layout style={styles.headerLeft}>
                <MaterialCommunityIcons 
                  name="clock-outline"
                  size={20}
                  color="#8F9BB3"
                  style={styles.stockEntriesIcon}
                />
                <Text category="h6">Latest Stock Entries</Text>
              </Layout>
            </Layout>
            {stats.latestEntries.length > 0 ? (
              stats.latestEntries.map((entry) => (
                <Layout key={entry.name} style={styles.stockEntryItem}>
                  <Layout style={styles.stockEntryType}>
                    <MaterialCommunityIcons 
                      name="arrow-right"
                      size={20}
                      color="#8F9BB3"
                    />
                    <Layout>
                      <Text>{entry.stock_entry_type}</Text>
                      <Text category="c1" appearance="hint">
                        {new Date(entry.posting_date).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </Layout>
                  </Layout>
                  <Text category="c1">{entry.name}</Text>
                </Layout>
              ))
            ) : (
              <Text appearance="hint" style={styles.emptyText}>No recent stock entries</Text>
            )}
          </Card>

          <Card style={styles.lowStockCard}>
            <Layout style={styles.stockEntriesHeader}>
              <Layout style={styles.headerLeft}>
                <MaterialCommunityIcons 
                  name="alert-outline"
                  size={20}
                  color="#ff3d71"
                  style={styles.stockEntriesIcon}
                />
                <Text category="h6">Low Stock Items</Text>
              </Layout>
              <Text category="s1" appearance="hint">
                Total: {stats.lowStockItems.length}
              </Text>
            </Layout>
            {stats.lowStockItems.length > 0 ? (
              stats.lowStockItems.map((item) => (
                <Layout key={item.item_code} style={styles.stockEntryItem}>
                  <Layout style={styles.stockEntryType}>
                    <MaterialCommunityIcons 
                      name="arrow-right"
                      size={20}
                      color="#ff3d71"
                    />
                    <Layout>
                      <Text>{item.item_name}</Text>
                      <Text category="c1" appearance="hint">
                        Stock: {item.current_stock} | Reorder: {item.reorder_level}
                      </Text>
                      {item.description && (
                        <Text category="c1" appearance="hint" numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </Layout>
                  </Layout>
                  <Text category="c1" style={[
                    styles.stockStatus,
                    { color: item.status === 'Out of Stock' ? '#ff3d71' : '#ffaa00' }
                  ]}>
                    {item.status}
                  </Text>
                </Layout>
              ))
            ) : (
              <Text appearance="hint" style={styles.emptyText}>No low stock items</Text>
            )}
          </Card>
        </Layout>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topNav: {
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  dateCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    margin: 8,
    borderRadius: 8,
  },
  statContent: {
    gap: 8,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockEntriesCard: {
    marginTop: 16,
    borderRadius: 8,
  },
  latestEntriesCard: {
    marginTop: 16,
    borderRadius: 8,
  },
  lowStockCard: {
    marginTop: 16,
    borderRadius: 8,
  },
  stockEntriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginRight: 8,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  stockEntriesIcon: {
    marginRight: 8,
  },
  stockEntryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stockEntryType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 8,
  },
  stockStatus: {
    color: '#ff3d71',
  }
});
