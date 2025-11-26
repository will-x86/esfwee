{
  description = "Basic rust flake :)";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      nixpkgs,
      rust-overlay,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
          config = {
            android_sdk.accept_license = true;
            allowUnfree = true;
          };
        };
        androidComposition = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [
            "34"
            "35"
            "36"
          ];
          buildToolsVersions = [
            "34.0.0"
            "35.0.0"
            "36.0.0"
          ];
          includeNDK = true;
          ndkVersion = "27.1.12297006";
          cmakeVersions = [ "3.22.1" ];
        };
      in
      with pkgs;
      {
        devShells.default = mkShell {
          LD_LIBRARY_PATH = lib.makeLibraryPath [ openssl ];
          buildInputs = [
            sqlx-cli
            openssl
            pkg-config
            eza
            fd
            rust-bin.stable.latest.default
            rust-analyzer
            zsh
            androidComposition.androidsdk
            jdk17
            nodejs
            bruno
            eas-cli
          ];
          shellHook = ''
            alias ls=eza
            export PATH=$PATH:${pkgs.rust-analyzer}/bin
            alias find=fd
            export ANDROID_HOME="${androidComposition.androidsdk}/libexec/android-sdk"
            export ANDROID_SDK_ROOT="$ANDROID_HOME"
            export PATH="$ANDROID_HOME/platform-tools:$PATH"
            export JAVA_HOME="${jdk17}"
          '';
        };
      }
    );
}
