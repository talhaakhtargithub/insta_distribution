import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native';
import { Text, FAB, Chip, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { Video as VideoIcon, CheckCircle2, Clock, XCircle } from 'lucide-react-native';
import { MESSAGES } from '../constants';
import { formatDuration } from '../utils';
import { useVideos } from '../hooks';
import { LoadingState, EmptyState, SkeletonCard } from '../components';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - spacing.md * 4) / 3;

type FilterType = 'all' | 'source' | 'edited' | 'uploaded';

export function VideosScreen() {
  const navigation = useNavigation();
  const { videos, loading, loadVideos, addVideo } = useVideos();
  const [filteredVideos, setFilteredVideos] = useState(videos);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  // Apply filter and search
  useEffect(() => {
    let filtered = videos;

    // Apply type filter
    switch (activeFilter) {
      case 'source':
        filtered = filtered.filter(v => !v.isEdited);
        break;
      case 'edited':
        filtered = filtered.filter(v => v.isEdited);
        break;
      case 'uploaded':
        filtered = filtered.filter(v => v.uploadedTo.length > 0);
        break;
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => {
        const effectsMatch = v.appliedEffects.some(e =>
          e.toLowerCase().includes(query)
        );
        const uploadedMatch = v.uploadedTo.some(a =>
          a.toLowerCase().includes(query)
        );
        const modMatch = v.modificationPercentage.toString().includes(query);

        return effectsMatch || uploadedMatch || modMatch;
      });
    }

    setFilteredVideos(filtered);
  }, [videos, activeFilter, searchQuery]);

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVideos();
    setRefreshing(false);
  };

  const generateThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      return uri;
    } catch (error) {
      console.warn('Thumbnail generation failed:', error);
      return undefined;
    }
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: MESSAGES.ERRORS.FILE_NOT_FOUND,
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

      // Generate thumbnail
      const thumbnailUri = await generateThumbnail(asset.uri);

      const video = {
        id: Date.now().toString(),
        uri: asset.uri,
        thumbnailUri,
        originalUri: asset.uri,
        duration: asset.duration || 0,
        isEdited: false,
        appliedEffects: [],
        modificationPercentage: 0,
        uploadedTo: [],
        createdAt: new Date().toISOString(),
      };

      await addVideo(video);
    }
  };

  const getStatusIcon = (video: any) => {
    if (video.uploadedTo.length > 0) {
      return <CheckCircle2 size={16} color={colors.success} />;
    }
    if (video.isEdited) {
      return <Clock size={16} color={colors.warning} />;
    }
    return <XCircle size={16} color={colors.light.textTertiary} />;
  };

  const renderVideo = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        style={styles.videoCard}
        onPress={() => navigation.navigate('VideoEditor' as never, { video: item } as never)}
      >
        <View style={styles.thumbnail}>
          {item.thumbnailUri ? (
            <Animated.Image
              source={{ uri: item.thumbnailUri }}
              style={styles.thumbnailImage}
              entering={FadeInDown}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <VideoIcon size={32} color={colors.light.textTertiary} />
            </View>
          )}

          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
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

  if (loading && videos.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Videos</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <SkeletonCard variant="video" />
          <SkeletonCard variant="video" />
          <SkeletonCard variant="video" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Videos</Text>
        <Searchbar
          placeholder={MESSAGES.PLACEHOLDERS.SEARCH_VIDEOS}
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
          All ({videos.length})
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
        ListEmptyComponent={
          <EmptyState
            icon={VideoIcon}
            title="No videos found"
            subtitle={
              searchQuery
                ? 'Try a different search term'
                : 'Add videos from your library to start editing'
            }
            action={!searchQuery ? {
              label: 'Add Video',
              onPress: handlePickVideo,
            } : undefined}
          />
        }
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
  skeletonContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
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
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
});
