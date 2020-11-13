## Marmara Insight Explorer

Marmara explorer is based on the **master** branch of [https://github.com/marmarachain/marmara/tree/master](https://github.com/marmarachain/marmara/tree/master). 

**Prerequisites and Conditions**
- This guide assumes that Marmara *has already been downloaded* to the machine.
- Tested on Ubuntu 18.04.5 and Ubuntu 20.04

> For detailed list of dependencies, check out the [package.json](https://github.com/DeckerSU/bitcore-node-komodo/blob/master/package.json) file. 
> Follow the instructions given in this [page](https://github.com/marmarachain/insight-ui-marmara) for the translations.

### How to Install?
Clone the git repo to local machine into a directory named explorer and inside the directory run the bash script to create the Marmara explorer and the relevant bitcore modules: 

```sh
git clone https://github.com/marmarachain/marmara-explorer-install.git explorer
cd explorer
./install-marmara-explorer.sh
```
> Important Notice: In case of failure, remove *-explorer folders, *-explorer-start.sh files and node modules folder before running ./install-marmara-explorer.sh script again.

Running the command above creates a directory structure under ```explorer``` directory as shown below:

```
explorer
│   README.md
│   install-marmara-explorer.sh
│   marmara-explorer-start.sh
│
│───node_modules
│   │
│   └───bitcore-node-komodo
│       │   ...
│
│───Marmara-explorer
│    │   bitcore-node.json
│    │   package.json
│    │
│    └──node_modules
│       │
│	│───bitcore-lib-komodo
│	│   │   ...
│    	│
│	│───bitcore-node-komodo
│	│   │   ...
│    	│
│	│───insight-api-komodo
│	│   │   ...
│    	│
│	│───insight-ui-komodo
│	│   │   ...
```

Having completed these steps, start the daemon with the starting parameters. Then, in the command line interface, run the bash script as follows:

```sh


```

Step-by-step guide:
1. Make sure you have all needed indexes enabled in MCL.conf:
txindex=1
addressindex=1
timestampindex=1
spentindex=1

2. Make sure the chain is synced with these indexes enabled. Look into debug.log, at daemon startup you should see:
LoadBlockIndexDB: transaction index enabled 
LoadBlockIndexDB: address index enabled
LoadBlockIndexDB: timestamp index enabled
LoadBlockIndexDB: spent index enabled

If one is disabled - it's wrong.
3. Make sure that getblockhashes RPC is working. If don't - you did a mistake somewhere. Re-check everything.
4. If you don't sure where exactly you did a mistake, delete everything except MCL.conf and sync chain from scratch.
5. Goal.

## Acknowledgements
The installation script of @DeckerSU in [here](https://github.com/DeckerSU/komodo-explorers-install) was modified to work for single chain i.e. Marmarachain.  Special thanks to @DeckerSu for their hardwork and @pbca26 for their valuable contributions and guide while getting the explorer work.

