import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Image,
  Pressable,
} from 'react-native';
import { Text, FAB, Chip, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { getVideos, saveVideo, Video } from '../services/storage';
import { Video as VideoIcon, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - spacing.md * 4) / 3;

type FilterType = 'all' | 'source' | 'edited' | 'uploaded';

export function VideosScreen() {
  const navigation = useNavigation();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const loadVideos = async () => {
    const data = await getVideos();
    setVideos(data);
    applyFilter(data, activeFilter);
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  const applyFilter = (data: Video[], filter: FilterType) => {
    let filtered = data;
    switch (filter) {
      case 'source':
        filtered = data.filter(v => !v.isEdited);
        break;
      case 'edited':
        filtered = data.filter(v => v.isEdited);
        break;
      case 'uploaded':
        filtered = data.filter(v => v.uploadedTo.length > 0);
        break;
    }
    setFilteredVideos(filtered);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilter(videos, filter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please grant media library access',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const video: Video = {
        id: Date.now().toString(),
        uri: asset.uri,
        originalUri: asset.uri,
        duration: asset.duration || 0,
        isEdited: false,
        appliedEffects: [],
        modificationPercentage: 0,
        uploadedTo: [],
        createdAt: new Date().toISOString(),
      };

      await saveVideo(video);
      loadVideos();
      Toast.show({
        type: 'success',
        text1: 'Video Added',
        text2: 'Ready to apply effects',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (video: Video) => {
    if (video.uploadedTo.length > 0) {
      return <CheckCircle2 size={16} color={colors.success} />;
    }
    if (video.isEdited) {
      return <Clock size={16} color={colors.warning} />;
    }
    return <XCircle size={16} color={colors.light.textTertiary} />;
  };

  const renderVideo = ({ item, index }: { item: Video; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={styles.videoCard}
        onPress={() => navigation.navigate('VideoEditor' as never, { video: item } as never)}
      >
        <View style={styles.thumbnail}>
          <View style={styles.thumbnailPlaceholder}>
            <VideoIcon size={32} color={colors.light.textTertiary} />
          </View>

          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration / 1000)}</Text>
          </View>

          <View style={styles.statusBadge}>
            {getStatusIcon(item)}
          </View>
        </View>

        {item.isEdited && (
          <View style={styles.modBadge}>
            <Text style={styles.modText}>{item.modificationPercentage}%</Text>
          </View>
        )}

        {item.uploadedTo.length > 0 && (
          <Text style={styles.uploadCount}>
            {item.uploadedTo.length} account{item.uploadedTo.length > 1 ? 's' : ''}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <VideoIcon size={48} color={colors.light.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No videos yet</Text>
      <Text style={styles.emptySubtitle}>
        Add videos from your library to start editing
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Videos</Text>
        <Searchbar
          placeholder="Search videos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={styles.filterContainer}>
        <Chip
          selected={activeFilter === 'all'}
          onPress={() => handleFilterChange('all')}
          style={styles.filterChip}
          textStyle={activeFilter === 'all' ? styles.filterTextActive : styles.filterText}
        >
          All
        </Chip>
        <Chip
          selected={activeFilter === 'source'}
          onPress={() => handleFilterChange('source')}
          style={styles.filterChip}
          textStyle={activeFilter === 'source' ? styles.filterTextActive : styles.filterText}
        >
          Source
        </Chip>
        <Chip
          selected={activeFilter === 'edited'}
          onPress={() => handleFilterChange('edited')}
          style={styles.filterChip}
          textStyle={activeFilter === 'edited' ? styles.filterTextActive : styles.filterText}
        >
          Edited
        </Chip>
        <Chip
          selected={activeFilter === 'uploaded'}
          onPress={() => handleFilterChange('uploaded')}
          style={styles.filterChip}
          textStyle={activeFilter === 'uploaded' ? styles.filterTextActive : styles.filterText}
        >
          Uploaded
        </Chip>
      </View>

      <FlatList
        data={filteredVideos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideo}
        numColumns={3}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={EmptyState}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handlePickVideo}
        label="Add Video"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.divider,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: spacing.sm,
  },
  searchBar: {
    backgroundColor: colors.light.surfaceVariant,
    elevation: 0,
  },
  searchInput: {
    fontSize: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.light.surfaceVariant,
  },
  filterText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  filterTextActive: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '600',
  },
  grid: {
    padding: spacing.sm,
    paddingBottom: 100,
  },
  videoCard: {
    width: ITEM_SIZE,
    margin: spacing.xs,
  },
  thumbnail: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.5,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.light.surfaceVariant,
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
  },
  modBadge: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  modText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  uploadCount: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary.main,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.light.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.light.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
