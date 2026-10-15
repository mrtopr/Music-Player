import React, { forwardRef } from 'react';

// Core Animated Icon Components from lucide-animated
export { default as ActivityIcon, ActivityIcon as ActivityIconComp } from './ActivityIcon';
export { default as ArrowDownIcon } from './ArrowDownIcon';
export { default as ArrowLeftIcon } from './ArrowLeftIcon';
export { default as ArrowRightIcon } from './ArrowRightIcon';
export { default as ArrowUpIcon } from './ArrowUpIcon';
export { default as AudioLinesIcon } from './AudioLinesIcon';
export { default as BadgeAlertIcon } from './BadgeAlertIcon';
export { default as BellIcon } from './BellIcon';
export { default as BookmarkIcon } from './BookmarkIcon';
export { default as BookmarkPlusIcon } from './BookmarkPlusIcon';
export { default as CalendarDaysIcon } from './CalendarDaysIcon';
export { default as CastIcon } from './CastIcon';
export { default as ChartBarIncreasingIcon } from './ChartBarIncreasingIcon';
export { default as ChartLineIcon } from './ChartLineIcon';
export { default as CheckCheckIcon } from './CheckCheckIcon';
export { default as CheckIcon } from './CheckIcon';
export { default as ChevronDownIcon } from './ChevronDownIcon';
export { default as ChevronFirstIcon } from './ChevronFirstIcon';
export { default as ChevronLeftIcon } from './ChevronLeftIcon';
export { default as ChevronRightIcon } from './ChevronRightIcon';
export { default as ChevronUpIcon } from './ChevronUpIcon';
export { default as ChevronsLeftRightIcon } from './ChevronsLeftRightIcon';
export { default as ChevronsRightLeftIcon } from './ChevronsRightLeftIcon';
export { default as CircleCheckIcon } from './CircleCheckIcon';
export { default as CircleHelpIcon } from './CircleHelpIcon';
export { default as ClockIcon } from './ClockIcon';
export { default as CompassIcon } from './CompassIcon';
export { default as DeleteIcon } from './DeleteIcon';
export { default as Disc3Icon } from './Disc3Icon';
export { default as DownloadIcon } from './DownloadIcon';
export { default as ExternalLinkIcon } from './ExternalLinkIcon';
export { default as EyeIcon } from './EyeIcon';
export { default as EyeOffIcon } from './EyeOffIcon';
export { default as FlameIcon } from './FlameIcon';
export { default as FolderPlusIcon } from './FolderPlusIcon';
export { default as FrownIcon } from './FrownIcon';
export { default as HardDriveDownloadIcon } from './HardDriveDownloadIcon';
export { default as HeartIcon } from './HeartIcon';
export { default as HistoryIcon } from './HistoryIcon';
export { default as HomeIcon } from './HomeIcon';
export { default as KeyIcon } from './KeyIcon';
export { default as LayersIcon } from './LayersIcon';
export { default as ListMusicIcon } from './ListMusicIcon';
export { default as LoaderCircleIcon } from './LoaderCircleIcon';
export { default as LoaderIcon } from './LoaderIcon';
export { default as LockIcon } from './LockIcon';
export { default as LoginIcon } from './LoginIcon';
export { default as LogoutIcon } from './LogoutIcon';
export { default as MailCheckIcon } from './MailCheckIcon';
export { default as Maximize2Icon } from './Maximize2Icon';
export { default as MaximizeIcon } from './MaximizeIcon';
export { default as MessageSquareIcon } from './MessageSquareIcon';
export { default as MicIcon } from './MicIcon';
export { default as MicOffIcon } from './MicOffIcon';
export { default as MinimizeIcon } from './MinimizeIcon';
export { default as MoonIcon } from './MoonIcon';
export { default as PaletteIcon } from './PaletteIcon';
export { default as PauseIcon } from './PauseIcon';
export { default as PhoneIcon } from './PhoneIcon';
export { default as PlayIcon } from './PlayIcon';
export { default as PlusIcon } from './PlusIcon';
export { default as RadioIcon } from './RadioIcon';
export { default as RefreshCcwIcon } from './RefreshCcwIcon';
export { default as RefreshCwIcon } from './RefreshCwIcon';
export { default as RepeatIcon } from './RepeatIcon';
export { default as RotateCcwIcon } from './RotateCcwIcon';
export { default as RotateCwIcon } from './RotateCwIcon';
export { default as SearchIcon } from './SearchIcon';
export { default as SendIcon } from './SendIcon';
export { default as SettingsIcon } from './SettingsIcon';
export { default as ShieldCheckIcon } from './ShieldCheckIcon';
export { default as ShuffleIcon } from './ShuffleIcon';
export { default as SkipBackIcon } from './SkipBackIcon';
export { default as SkipForwardIcon } from './SkipForwardIcon';
export { default as SlidersHorizontalIcon } from './SlidersHorizontalIcon';
export { default as SparklesIcon } from './SparklesIcon';
export { default as SunIcon } from './SunIcon';
export { default as TrendingUpIcon } from './TrendingUpIcon';
export { default as UploadIcon } from './UploadIcon';
export { default as UserIcon } from './UserIcon';
export { default as UsersIcon } from './UsersIcon';
export { default as VolumeIcon } from './VolumeIcon';
export { default as VolumeToggleIcon } from './VolumeToggleIcon';
export { default as WifiIcon } from './WifiIcon';
export { default as XIcon } from './XIcon';
export { default as YoutubeIcon } from './YoutubeIcon';
export { default as ZapIcon } from './ZapIcon';

export const MoreHorizontal = forwardRef(function MoreHorizontal({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', style = {}, ...props }, ref) {
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} {...props}>
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <circle cx="19" cy="12" r="1.5" fill={color} />
      <circle cx="5" cy="12" r="1.5" fill={color} />
    </svg>
  );
});

export const MoreVertical = forwardRef(function MoreVertical({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', style = {}, ...props }, ref) {
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} {...props}>
      <circle cx="12" cy="12" r="1.5" fill={color} />
      <circle cx="12" cy="5" r="1.5" fill={color} />
      <circle cx="12" cy="19" r="1.5" fill={color} />
    </svg>
  );
});

// Import individual icons for map & wrappers
import ActivityIcon from './ActivityIcon';
import ArrowDownIcon from './ArrowDownIcon';
import ArrowLeftIcon from './ArrowLeftIcon';
import ArrowRightIcon from './ArrowRightIcon';
import ArrowUpIcon from './ArrowUpIcon';
import AudioLinesIcon from './AudioLinesIcon';
import BadgeAlertIcon from './BadgeAlertIcon';
import BellIcon from './BellIcon';
import BookmarkIcon from './BookmarkIcon';
import BookmarkPlusIcon from './BookmarkPlusIcon';
import CalendarDaysIcon from './CalendarDaysIcon';
import CastIcon from './CastIcon';
import ChartBarIncreasingIcon from './ChartBarIncreasingIcon';
import ChartLineIcon from './ChartLineIcon';
import CheckCheckIcon from './CheckCheckIcon';
import CheckIcon from './CheckIcon';
import ChevronDownIcon from './ChevronDownIcon';
import ChevronFirstIcon from './ChevronFirstIcon';
import ChevronLeftIcon from './ChevronLeftIcon';
import ChevronRightIcon from './ChevronRightIcon';
import ChevronUpIcon from './ChevronUpIcon';
import ChevronsLeftRightIcon from './ChevronsLeftRightIcon';
import ChevronsRightLeftIcon from './ChevronsRightLeftIcon';
import CircleCheckIcon from './CircleCheckIcon';
import CircleHelpIcon from './CircleHelpIcon';
import ClockIcon from './ClockIcon';
import CompassIcon from './CompassIcon';
import DeleteIcon from './DeleteIcon';
import Disc3Icon from './Disc3Icon';
import DownloadIcon from './DownloadIcon';
import ExternalLinkIcon from './ExternalLinkIcon';
import EyeIcon from './EyeIcon';
import EyeOffIcon from './EyeOffIcon';
import FlameIcon from './FlameIcon';
import FolderPlusIcon from './FolderPlusIcon';
import FrownIcon from './FrownIcon';
import HardDriveDownloadIcon from './HardDriveDownloadIcon';
import HeartIcon from './HeartIcon';
import HistoryIcon from './HistoryIcon';
import HomeIcon from './HomeIcon';
import KeyIcon from './KeyIcon';
import LayersIcon from './LayersIcon';
import ListMusicIcon from './ListMusicIcon';
import LoaderCircleIcon from './LoaderCircleIcon';
import LoaderIcon from './LoaderIcon';
import LockIcon from './LockIcon';
import LoginIcon from './LoginIcon';
import LogoutIcon from './LogoutIcon';
import MailCheckIcon from './MailCheckIcon';
import Maximize2Icon from './Maximize2Icon';
import MaximizeIcon from './MaximizeIcon';
import MessageSquareIcon from './MessageSquareIcon';
import MicIcon from './MicIcon';
import MicOffIcon from './MicOffIcon';
import MinimizeIcon from './MinimizeIcon';
import MoonIcon from './MoonIcon';
import PaletteIcon from './PaletteIcon';
import PauseIcon from './PauseIcon';
import PhoneIcon from './PhoneIcon';
import PlayIcon from './PlayIcon';
import PlusIcon from './PlusIcon';
import RadioIcon from './RadioIcon';
import RefreshCcwIcon from './RefreshCcwIcon';
import RefreshCwIcon from './RefreshCwIcon';
import RepeatIcon from './RepeatIcon';
import RotateCcwIcon from './RotateCcwIcon';
import RotateCwIcon from './RotateCwIcon';
import SearchIcon from './SearchIcon';
import SendIcon from './SendIcon';
import SettingsIcon from './SettingsIcon';
import ShieldCheckIcon from './ShieldCheckIcon';
import ShuffleIcon from './ShuffleIcon';
import SkipBackIcon from './SkipBackIcon';
import SkipForwardIcon from './SkipForwardIcon';
import SlidersHorizontalIcon from './SlidersHorizontalIcon';
import SparklesIcon from './SparklesIcon';
import SunIcon from './SunIcon';
import TrendingUpIcon from './TrendingUpIcon';
import UploadIcon from './UploadIcon';
import UserIcon from './UserIcon';
import UsersIcon from './UsersIcon';
import VolumeIcon from './VolumeIcon';
import VolumeToggleIcon from './VolumeToggleIcon';
import WifiIcon from './WifiIcon';
import XIcon from './XIcon';
import YoutubeIcon from './YoutubeIcon';
import ZapIcon from './ZapIcon';

// Comprehensive Icon Registry Map
const ICON_MAP = {
  // Playback & Audio
  'play': PlayIcon,
  'play-circle': PlayIcon,
  'playcircle': PlayIcon,
  'pause': PauseIcon,
  'pause-circle': PauseIcon,
  'pausecircle': PauseIcon,
  'skip-forward': SkipForwardIcon,
  'skipforward': SkipForwardIcon,
  'skip-back': SkipBackIcon,
  'skipback': SkipBackIcon,
  'fast-forward': SkipForwardIcon,
  'rewind': SkipBackIcon,
  'volume': VolumeIcon,
  'volume-2': VolumeIcon,
  'volume2': VolumeIcon,
  'volume-x': VolumeToggleIcon,
  'volumex': VolumeToggleIcon,
  'volume-mute': VolumeToggleIcon,
  'shuffle': ShuffleIcon,
  'repeat': RepeatIcon,
  'repeat-1': RepeatIcon,
  'repeat1': RepeatIcon,
  'equalizer': SlidersHorizontalIcon,
  'sliders': SlidersHorizontalIcon,
  'sliders-horizontal': SlidersHorizontalIcon,
  'slidershorizontal': SlidersHorizontalIcon,

  // Navigation & Music Views
  'home': HomeIcon,
  'search': SearchIcon,
  'search-icon': SearchIcon,
  'magnifier': SearchIcon,
  'music': AudioLinesIcon,
  'music-note': AudioLinesIcon,
  'music2': AudioLinesIcon,
  'audiolines': AudioLinesIcon,
  'audio-lines': AudioLinesIcon,
  'disc': Disc3Icon,
  'disc3': Disc3Icon,
  'mic': MicIcon,
  'mic2': MicIcon,
  'mic-off': MicOffIcon,
  'micoff': MicOffIcon,
  'microphone': MicIcon,
  'playlist': ListMusicIcon,
  'list-music': ListMusicIcon,
  'listmusic': ListMusicIcon,
  'list-plus': FolderPlusIcon,
  'listplus': FolderPlusIcon,
  'folder-plus': FolderPlusIcon,
  'folderplus': FolderPlusIcon,
  'library': LayersIcon,
  'layers': LayersIcon,
  'album-plus': FolderPlusIcon,
  'download': DownloadIcon,
  'hard-drive-download': HardDriveDownloadIcon,
  'radio': RadioIcon,

  // UI Actions & States
  'heart': HeartIcon,
  'settings': SettingsIcon,
  'settings-icon': SettingsIcon,
  'gear': SettingsIcon,
  'cog': SettingsIcon,
  'moon': MoonIcon,
  'sun': SunIcon,
  'clock': ClockIcon,
  'calendar': CalendarDaysIcon,
  'calendar-days': CalendarDaysIcon,
  'history': HistoryIcon,
  'trash': DeleteIcon,
  'trash-2': DeleteIcon,
  'trash2': DeleteIcon,
  'delete': DeleteIcon,
  'share': SendIcon,
  'share-2': SendIcon,
  'share2': SendIcon,
  'send': SendIcon,
  'plus': PlusIcon,
  'check': CheckIcon,
  'check-check': CheckCheckIcon,
  'checkcheck': CheckCheckIcon,
  'check-circle': CircleCheckIcon,
  'check-circle-2': CircleCheckIcon,
  'check-circle2': CircleCheckIcon,
  'checkcircle': CircleCheckIcon,
  'checkcircle2': CircleCheckIcon,
  'circle-check': CircleCheckIcon,
  'cross': XIcon,
  'close': XIcon,
  'x': XIcon,
  'sparkles': SparklesIcon,
  'star': SparklesIcon,
  'award': SparklesIcon,
  'flame': FlameIcon,
  'fire': FlameIcon,
  'rotate-ccw': RotateCcwIcon,
  'rotateccw': RotateCcwIcon,
  'rotate-cw': RotateCwIcon,
  'rotatecw': RotateCwIcon,
  'refresh-cw': RefreshCwIcon,
  'refreshcw': RefreshCwIcon,
  'refresh-ccw': RefreshCcwIcon,
  'refreshccw': RefreshCcwIcon,
  'frown': FrownIcon,

  // Directional
  'arrow-left': ArrowLeftIcon,
  'arrowleft': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon,
  'arrowright': ArrowRightIcon,
  'arrow-up': ArrowUpIcon,
  'arrowup': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,
  'arrowdown': ArrowDownIcon,
  'chevron-down': ChevronDownIcon,
  'chevrondown': ChevronDownIcon,
  'chevron-up': ChevronUpIcon,
  'chevronup': ChevronUpIcon,
  'chevron-left': ChevronLeftIcon,
  'chevronleft': ChevronLeftIcon,
  'chevron-right': ChevronRightIcon,
  'chevronright': ChevronRightIcon,
  'chevron-first': ChevronFirstIcon,
  'chevronfirst': ChevronFirstIcon,
  'chevrons-left-right': ChevronsLeftRightIcon,
  'chevrons-right-left': ChevronsRightLeftIcon,

  // Media, Hardware & System
  'tv': CastIcon,
  'cast': CastIcon,
  'monitor': CastIcon,
  'video': CastIcon,
  'file-video': CastIcon,
  'filevideo': CastIcon,
  'camera': CastIcon,
  'smartphone': PhoneIcon,
  'phone': PhoneIcon,
  'user': UserIcon,
  'users': UsersIcon,
  'log-in': LoginIcon,
  'login': LoginIcon,
  'log-out': LogoutIcon,
  'logout': LogoutIcon,
  'loader': LoaderCircleIcon,
  'loader-2': LoaderCircleIcon,
  'loader2': LoaderCircleIcon,
  'loader-circle': LoaderCircleIcon,
  'shield': ShieldCheckIcon,
  'shield-check': ShieldCheckIcon,
  'shieldcheck': ShieldCheckIcon,
  'shield-alert': BadgeAlertIcon,
  'shieldalert': BadgeAlertIcon,
  'alert-circle': BadgeAlertIcon,
  'alertcircle': BadgeAlertIcon,
  'external-link': ExternalLinkIcon,
  'externallink': ExternalLinkIcon,
  'magnet': ExternalLinkIcon,
  'maximize': Maximize2Icon,
  'maximize-2': Maximize2Icon,
  'maximize2': Maximize2Icon,
  'minimize': MinimizeIcon,
  'minimize-2': MinimizeIcon,
  'minimize2': MinimizeIcon,
  'more-horizontal': MoreHorizontal,
  'morehorizontal': MoreHorizontal,
  'more-vertical': MoreVertical,
  'morevertical': MoreVertical,
  'more': MoreHorizontal,
  'eye': EyeIcon,
  'eye-off': EyeOffIcon,
  'eyeoff': EyeOffIcon,
  'headphones': AudioLinesIcon,
  'info': CircleHelpIcon,
  'help': CircleHelpIcon,
  'circle-help': CircleHelpIcon,
  'bar-chart-2': ChartBarIncreasingIcon,
  'barchart2': ChartBarIncreasingIcon,
  'trending-up': TrendingUpIcon,
  'trendingup': TrendingUpIcon,
  'palette': PaletteIcon,
  'compass': CompassIcon,
  'activity': ActivityIcon,
  'zap': ZapIcon,
  'key-round': KeyIcon,
  'keyround': KeyIcon,
  'key': KeyIcon,
  'lock': LockIcon,
  'wifi': WifiIcon,
  'bell': BellIcon,
  'bookmark': BookmarkIcon,
  'bookmark-plus': BookmarkPlusIcon,
  'message-square': MessageSquareIcon,
  'mail': MailCheckIcon,
  'upload': UploadIcon,
  'youtube': YoutubeIcon,
};

/**
 * Universal AnimatedIcon component:
 * Drop-in replacement for any icon requirement with animated motion.
 */
export const AnimatedIcon = forwardRef(function AnimatedIcon(
  { name = 'play', size = 24, className = '', color, style = {}, ...props },
  ref
) {
  const normalizedKey = (name || 'play').toLowerCase().trim();
  const IconComponent = ICON_MAP[normalizedKey] || ICON_MAP['play'];

  const combinedStyle = {
    color: color || 'currentColor',
    ...style,
  };

  return (
    <span
      className={`inline-flex items-center justify-center align-middle flex-shrink-0 ${className}`.trim()}
      style={combinedStyle}
    >
      <IconComponent ref={ref} size={size} {...props} />
    </span>
  );
});

AnimatedIcon.displayName = 'AnimatedIcon';
export default AnimatedIcon;

// Direct named component wrappers matching standard Lucide & project APIs
export const Play = forwardRef((props, ref) => <PlayIcon ref={ref} {...props} />);
export const PlayCircle = forwardRef((props, ref) => <PlayIcon ref={ref} {...props} />);
export const Pause = forwardRef((props, ref) => <PauseIcon ref={ref} {...props} />);
export const PauseCircle = forwardRef((props, ref) => <PauseIcon ref={ref} {...props} />);
export const SkipBack = forwardRef((props, ref) => <SkipBackIcon ref={ref} {...props} />);
export const SkipForward = forwardRef((props, ref) => <SkipForwardIcon ref={ref} {...props} />);
export const Volume = forwardRef((props, ref) => <VolumeIcon ref={ref} {...props} />);
export const Volume2 = forwardRef((props, ref) => <VolumeIcon ref={ref} {...props} />);
export const VolumeX = forwardRef((props, ref) => <VolumeToggleIcon ref={ref} {...props} />);
export const Heart = forwardRef((props, ref) => <HeartIcon ref={ref} {...props} />);
export const Shuffle = forwardRef((props, ref) => <ShuffleIcon ref={ref} {...props} />);
export const Repeat = forwardRef((props, ref) => <RepeatIcon ref={ref} {...props} />);
export const Repeat1 = forwardRef(({ size = 20, color = 'currentColor', strokeWidth = 2, className = '', style = {}, ...props }, ref) => (
  <svg ref={ref} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} {...props}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10h1v4" />
  </svg>
));
export const Home = forwardRef((props, ref) => <HomeIcon ref={ref} {...props} />);
export const Search = forwardRef((props, ref) => <SearchIcon ref={ref} {...props} />);
export const Music = forwardRef((props, ref) => <AudioLinesIcon ref={ref} {...props} />);
export const Music2 = forwardRef((props, ref) => <AudioLinesIcon ref={ref} {...props} />);
export const AudioLines = forwardRef((props, ref) => <AudioLinesIcon ref={ref} {...props} />);
export const ListMusic = forwardRef((props, ref) => <ListMusicIcon ref={ref} {...props} />);
export const Plus = forwardRef((props, ref) => <PlusIcon ref={ref} {...props} />);
export const Check = forwardRef((props, ref) => <CheckIcon ref={ref} {...props} />);
export const CheckCircle = forwardRef((props, ref) => <CircleCheckIcon ref={ref} {...props} />);
export const CheckCircle2 = forwardRef((props, ref) => <CircleCheckIcon ref={ref} {...props} />);
export const X = forwardRef((props, ref) => <XIcon ref={ref} {...props} />);
export const Settings = forwardRef((props, ref) => <SettingsIcon ref={ref} {...props} />);
export const Trash2 = forwardRef((props, ref) => <DeleteIcon ref={ref} {...props} />);
export const Share2 = forwardRef((props, ref) => <SendIcon ref={ref} {...props} />);
export const Download = forwardRef((props, ref) => <DownloadIcon ref={ref} {...props} />);
export const Mic = forwardRef((props, ref) => <MicIcon ref={ref} {...props} />);
export const Mic2 = forwardRef((props, ref) => <MicIcon ref={ref} {...props} />);
export const MicOff = forwardRef((props, ref) => <MicOffIcon ref={ref} {...props} />);
export const Moon = forwardRef((props, ref) => <MoonIcon ref={ref} {...props} />);
export const Sun = forwardRef((props, ref) => <SunIcon ref={ref} {...props} />);
export const Clock = forwardRef((props, ref) => <ClockIcon ref={ref} {...props} />);
export const Calendar = forwardRef((props, ref) => <CalendarDaysIcon ref={ref} {...props} />);
export const Sparkles = forwardRef((props, ref) => <SparklesIcon ref={ref} {...props} />);
export const Flame = forwardRef((props, ref) => <FlameIcon ref={ref} {...props} />);
export const User = forwardRef((props, ref) => <UserIcon ref={ref} {...props} />);
export const Users = forwardRef((props, ref) => <UsersIcon ref={ref} {...props} />);
export const SlidersHorizontal = forwardRef((props, ref) => <SlidersHorizontalIcon ref={ref} {...props} />);
export const ChevronDown = forwardRef((props, ref) => <ChevronDownIcon ref={ref} {...props} />);
export const ChevronUp = forwardRef((props, ref) => <ChevronUpIcon ref={ref} {...props} />);
export const ChevronLeft = forwardRef((props, ref) => <ChevronLeftIcon ref={ref} {...props} />);
export const ChevronRight = forwardRef((props, ref) => <ChevronRightIcon ref={ref} {...props} />);
export const ArrowLeft = forwardRef((props, ref) => <ArrowLeftIcon ref={ref} {...props} />);
export const ArrowRight = forwardRef((props, ref) => <ArrowRightIcon ref={ref} {...props} />);
export const Tv = forwardRef((props, ref) => <CastIcon ref={ref} {...props} />);
export const Disc = forwardRef((props, ref) => <Disc3Icon ref={ref} {...props} />);
export const Disc3 = forwardRef((props, ref) => <Disc3Icon ref={ref} {...props} />);
export const Radio = forwardRef((props, ref) => <RadioIcon ref={ref} {...props} />);
export const LogOut = forwardRef((props, ref) => <LogoutIcon ref={ref} {...props} />);
export const LogIn = forwardRef((props, ref) => <LoginIcon ref={ref} {...props} />);
export const Loader2 = forwardRef((props, ref) => <LoaderCircleIcon ref={ref} {...props} />);
export const ExternalLink = forwardRef((props, ref) => <ExternalLinkIcon ref={ref} {...props} />);
export const Maximize2 = forwardRef((props, ref) => <Maximize2Icon ref={ref} {...props} />);
export const Minimize2 = forwardRef((props, ref) => <MinimizeIcon ref={ref} {...props} />);
export const RotateCcw = forwardRef((props, ref) => <RotateCcwIcon ref={ref} {...props} />);
export const RotateCw = forwardRef((props, ref) => <RotateCwIcon ref={ref} {...props} />);
export const RefreshCw = forwardRef((props, ref) => <RefreshCwIcon ref={ref} {...props} />);
export const Eye = forwardRef((props, ref) => <EyeIcon ref={ref} {...props} />);
export const EyeOff = forwardRef((props, ref) => <EyeOffIcon ref={ref} {...props} />);
export const ShieldCheck = forwardRef((props, ref) => <ShieldCheckIcon ref={ref} {...props} />);
export const ShieldAlert = forwardRef((props, ref) => <BadgeAlertIcon ref={ref} {...props} />);
export const AlertCircle = forwardRef((props, ref) => <BadgeAlertIcon ref={ref} {...props} />);
export const BarChart2 = forwardRef((props, ref) => <ChartBarIncreasingIcon ref={ref} {...props} />);
export const Palette = forwardRef((props, ref) => <PaletteIcon ref={ref} {...props} />);
export const Compass = forwardRef((props, ref) => <CompassIcon ref={ref} {...props} />);
export const Activity = forwardRef((props, ref) => <ActivityIcon ref={ref} {...props} />);
export const Zap = forwardRef((props, ref) => <ZapIcon ref={ref} {...props} />);
export const KeyRound = forwardRef((props, ref) => <KeyIcon ref={ref} {...props} />);
export const ListPlus = forwardRef((props, ref) => <FolderPlusIcon ref={ref} {...props} />);
export const FolderPlus = forwardRef((props, ref) => <FolderPlusIcon ref={ref} {...props} />);
export const Star = forwardRef((props, ref) => <SparklesIcon ref={ref} {...props} />);
export const Award = forwardRef((props, ref) => <SparklesIcon ref={ref} {...props} />);
export const Info = forwardRef((props, ref) => <CircleHelpIcon ref={ref} {...props} />);
export const History = forwardRef((props, ref) => <HistoryIcon ref={ref} {...props} />);
export const Bell = forwardRef((props, ref) => <BellIcon ref={ref} {...props} />);
export const Frown = forwardRef((props, ref) => <FrownIcon ref={ref} {...props} />);
export const Smartphone = forwardRef((props, ref) => <PhoneIcon ref={ref} {...props} />);
export const Camera = forwardRef((props, ref) => <CastIcon ref={ref} {...props} />);
export const FileVideo = forwardRef((props, ref) => <CastIcon ref={ref} {...props} />);
export const HardDrive = forwardRef((props, ref) => <HardDriveDownloadIcon ref={ref} {...props} />);
export const Headphones = forwardRef((props, ref) => <AudioLinesIcon ref={ref} {...props} />);
export const Magnet = forwardRef((props, ref) => <ExternalLinkIcon ref={ref} {...props} />);
export const Mail = forwardRef((props, ref) => <MailCheckIcon ref={ref} {...props} />);
export const Monitor = forwardRef((props, ref) => <CastIcon ref={ref} {...props} />);
export const Upload = forwardRef((props, ref) => <UploadIcon ref={ref} {...props} />);
export const Youtube = forwardRef((props, ref) => <YoutubeIcon ref={ref} {...props} />);
export const TrendingUp = forwardRef((props, ref) => <TrendingUpIcon ref={ref} {...props} />);
