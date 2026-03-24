import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:mehfil_music/core/theme/colors.dart';
import 'package:mehfil_music/features/player/player_controller.dart';
import 'package:mehfil_music/models/song.dart';
import 'package:mehfil_music/widgets/glass_card.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HomeScreen extends HookConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final player = ref.watch(playerProvider);
    
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 120,
            floating: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                "MEHFIL",
                style: TextStyle(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 4,
                ),
              ),
              centerTitle: true,
            ),
            actions: [
              IconButton(icon: const Icon(Icons.mic_none_rounded), onPressed: () {}),
              IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () {}),
            ],
          ),
          
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   const Text(
                    "Trending Now",
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  
                  // Horizontal Trending List
                  SizedBox(
                    height: 220,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: 5,
                      itemBuilder: (context, index) {
                        return _TrendingItem(
                          song: Song(
                            id: 'trending_$index',
                            title: 'Trending Track $index',
                            artist: 'Popular Artist',
                            imageUrl: 'https://picsum.photos/seed/${index+50}/400',
                            streamUrl: '',
                          ),
                        );
                      },
                    ),
                  ),
                  
                  const SizedBox(height: 40),
                  
                  const Text(
                    "Premium Collections",
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  
                  // Grid of Categories
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 15,
                    crossAxisSpacing: 15,
                    childAspectRatio: 1.5,
                    children: [
                      _CategoryCard(name: "Acoustic", color: Colors.blueGrey),
                      _CategoryCard(name: "Luxe Jazz", color: Colors.deepPurple),
                      _CategoryCard(name: "Midnight Pop", color: Colors.indigo),
                      _CategoryCard(name: "Classical", color: Colors.brown),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: player.currentSong != null ? _MiniPlayerOverlay() : null,
    );
  }
}

class _TrendingItem extends HookConsumerWidget {
  final Song song;
  const _TrendingItem({required this.song});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () {
        // ref.read(playerProvider.notifier).playSong(song);
        Navigator.pushNamed(context, '/player');
      },
      child: Container(
        width: 160,
        margin: const EdgeInsets.right(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Hero(
              tag: 'album_art_${song.id}',
              child: GlassCard(
                width: 160,
                height: 160,
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: CachedNetworkImage(
                      imageUrl: song.imageUrl,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(song.title, style: const TextStyle(fontWeight: FontWeight.bold), maxLines: 1),
            Text(song.artist, style: const TextStyle(color: Colors.white54, fontSize: 12), maxLines: 1),
          ],
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final String name;
  final Color color;
  const _CategoryCard({required this.name, required this.color});

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      width: 150,
      height: 100,
      child: Center(
         child: Text(
          name,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
    );
  }
}

class _MiniPlayerOverlay extends HookConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final player = ref.watch(playerProvider);
    final song = player.currentSong!;

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/player'),
      child: Container(
        margin: const EdgeInsets.all(10),
        child: GlassCard(
          width: double.infinity,
          height: 70,
          borderRadius: 15,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: CachedNetworkImage(imageUrl: song.imageUrl, width: 45, height: 45, fit: BoxFit.cover),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(song.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), maxLines: 1),
                      Text(song.artist, style: const TextStyle(color: Colors.white54, fontSize: 11), maxLines: 1),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(player.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded),
                  onPressed: () => ref.read(playerProvider.notifier).togglePlay(),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
