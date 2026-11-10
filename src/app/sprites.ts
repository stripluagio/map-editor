import { skinsFor } from '../core/constants';
import { state } from './state';
import { render } from '../render/canvas';

/** 所有会出现在左侧面板里的类型（与 `ENTITY_SKINS` 的键一致）。 */
const TYPES = ['npc', 'monster', 'transfer', 'spawnPoint', 'obj', 'prop', 'event'];

/**
 * 把「当前可选的皮肤」预加载成 `state.sprites[type][skinIndex] = 帧数组`。
 *
 * 启动时跑一次；「导入编辑资源」把用户图片追加进 `IMPORTED_SKINS` 之后要再跑一次，
 * 否则新皮肤有元数据却没有可画的 `Image`（画布上会是一片空白）。
 * 幂等：整个 `sprites` 重建。
 */
export function loadEntitySprites(): void {
  for (const type of TYPES) {
    const defs = skinsFor(type);
    state.sprites[type] = defs.map(def => {
      const files = def.frames && def.frames.length ? def.frames : [def.icon];
      return files.map(src => {
        const im = new Image();
        // 图片是异步解码的；解码完成就重绘一次，否则首帧会画成空白。
        im.onload = () => render();
        im.src = src;
        return im;
      });
    });
  }
}
