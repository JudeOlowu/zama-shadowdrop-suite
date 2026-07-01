import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const wagmiConfig = getDefaultConfig({
  appName: 'ShadowDrop',
  projectId: 'shadowdrop-zama-dev-program',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(`https://eth-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY || 'YqjOQa_2XOQHibPOdCUgL'}`),
  },
  ssr: false,
});

export const CONTRACTS = {
  WRAPPER_FACTORY: import.meta.env.VITE_WRAPPER_FACTORY_ADDRESS as `0x${string}`,
  AIRDROP: import.meta.env.VITE_AIRDROP_ADDRESS as `0x${string}`,
  TREASURY: import.meta.env.VITE_TREASURY_ADDRESS as `0x${string}`,
  MOCK_TOKEN: import.meta.env.VITE_MOCK_TOKEN_ADDRESS as `0x${string}`,
};
