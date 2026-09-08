<script lang="ts">
	import { PDFDocument } from 'pdf-lib';
	import Panel from '$lib/Panel.svelte';
	import FormGroup from '$lib/FormGroup.svelte';
	import PrimaryButton from '$lib/PrimaryButton.svelte';
	import SecondaryButton from '$lib/SecondaryButton.svelte';

	type ImageItem = {
		file: File;
		url: string;
		width: number;
		height: number;
	};

	const MM_TO_PT = 2.83465;
	const PAGE_FORMATS_PT: Record<string, [number, number]> = {
		a4: [595.28, 841.89],
		letter: [612, 792]
	};
	const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

	function shuffle<T>(items: T[]): T[] {
		const shuffled = [...items];
		for (let index = shuffled.length - 1; index > 0; index -= 1) {
			const randomIndex = Math.floor(Math.random() * (index + 1));
			[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
		}
		return shuffled;
	}

	function createTestImages(): ImageItem[] {
		return Array.from({ length: 10 }, (_, index) => {
			const width = index % 2 === 0 ? 1200 : 900;
			const height = index % 2 === 0 ? 900 : 1200;
			const hue = (index * 37) % 360;
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="hsl(${hue} 65% 45%)"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 4}" fill="hsl(${(hue + 60) % 360} 75% 75%)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="96" fill="white">Test ${index + 1}</text></svg>`;
			const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
			const file = new File([svg], `test-image-${String(index + 1).padStart(2, '0')}.svg`, {
				type: 'image/svg+xml'
			});

			return { file, url, width, height };
		});
	}

	let images = $state<ImageItem[]>([]);
	let dragSrcIndex = $state<number | null>(null);
	let isDragOver = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	let pdfTitle = $state('Merged Document');
	let pdfAuthor = $state('');
	let pdfSubject = $state('');
	let pdfKeywords = $state('');
	let pageSize = $state('a4');
	let fileName = $state('merged.pdf');
	let status = $state('');
	let statusType = $state<'error' | 'success' | ''>('');

	function handleDragZoneOnDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragZoneOnDragLeave() {
		isDragOver = false;
	}

	function handleDragZoneOnDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		void handleFiles(event.dataTransfer?.files ?? null);
	}

	function handleDragZoneInputOnChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void handleFiles(input.files);
	}

	function handleThumbOnDragStart(event: DragEvent, index: number) {
		dragSrcIndex = index;
	}

	function handleThumbOnDragEnd() {
		dragSrcIndex = null;
	}

	function handleThumbOnDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleThumbOnDrop(event: DragEvent, targetIndex: number) {
		event.preventDefault();
		reorderImages(targetIndex);
	}

	function handleThumbDeleteButtonOnClick(index: number) {
		images = images.filter((_, currentIndex) => currentIndex !== index);
	}

	function sortImagesByFileName() {
		images = [...images].sort((a, b) => collator.compare(a.file.name, b.file.name));
	}

	async function readImageFile(file: File): Promise<ImageItem> {
		return await new Promise((resolvePromise, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result;
				if (typeof result !== 'string') {
					reject(new Error('Unable to read image file.'));
					return;
				}

				const img = new Image();
				img.onload = () => {
					resolvePromise({
						file,
						url: result,
						width: img.naturalWidth,
						height: img.naturalHeight
					});
				};
				img.onerror = () => reject(new Error(`Unable to load image: ${file.name}`));
				img.src = result;
			};
			reader.onerror = () => reject(new Error(`Unable to read image: ${file.name}`));
			reader.readAsDataURL(file);
		});
	}

	async function handleFiles(fileList: FileList | null) {
		if (!fileList) return;
		const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
		if (files.length === 0) return;

		const loaded = await Promise.all(files.map((file) => readImageFile(file)));
		images = [...images, ...loaded];
		sortImagesByFileName();
		if (fileInputEl) fileInputEl.value = '';
	}

	function reorderImages(targetIndex: number) {
		if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
		const moved = images.splice(dragSrcIndex, 1)[0];
		images.splice(targetIndex, 0, moved);
		dragSrcIndex = null;
		images = [...images];
	}

	function clearAll() {
		images = [];
		status = '';
		statusType = '';
	}

	function resortImages() {
		sortImagesByFileName();
	}

	function normalizeImageToDataUrl(imgData: ImageItem): Promise<{ dataUrl: string; isPng: boolean }> {
		return new Promise((resolvePromise) => {
			const image = new Image();
			image.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					resolvePromise({ dataUrl: imgData.url, isPng: false });
					return;
				}

				ctx.drawImage(image, 0, 0);
				const mimeType = imgData.file.type;
				const isPng = mimeType.includes('png') || mimeType.includes('webp');
				const dataUrl = isPng
					? canvas.toDataURL('image/png')
					: canvas.toDataURL('image/jpeg', 0.92);

				resolvePromise({ dataUrl, isPng });
			};

			image.src = imgData.url;
		});
	}

	async function dataUrlToUint8Array(dataUrl: string) {
		const response = await fetch(dataUrl);
		const buffer = await response.arrayBuffer();
		return new Uint8Array(buffer);
	}

	async function generatePdf() {
		if (images.length === 0) return;

		const title = pdfTitle.trim() || 'Merged Document';
		const author = pdfAuthor.trim();
		const subject = pdfSubject.trim();
		const keywords = pdfKeywords
			.trim()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);
		const pageSizeChoice = pageSize;
		let outputName = fileName.trim() || 'merged.pdf';
		if (!outputName.toLowerCase().endsWith('.pdf')) outputName += '.pdf';

		status = '正在產生PDF...';
		statusType = '';

		try {
			const pdfDoc = await PDFDocument.create();

			for (const imgData of images) {
				const { dataUrl, isPng } = await normalizeImageToDataUrl(imgData);
				const bytes = await dataUrlToUint8Array(dataUrl);
				const embeddedImage = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

				const isLandscape = imgData.width >= imgData.height;
				let pageWidth: number;
				let pageHeight: number;

				if (pageSizeChoice === 'fit') {
					pageWidth = imgData.width;
					pageHeight = imgData.height;
				} else {
					const [baseW, baseH] = PAGE_FORMATS_PT[pageSizeChoice] || PAGE_FORMATS_PT.a4;
					const portraitW = Math.min(baseW, baseH);
					const portraitH = Math.max(baseW, baseH);

					if (isLandscape) {
						pageWidth = portraitH;
						pageHeight = portraitW;
					} else {
						pageWidth = portraitW;
						pageHeight = portraitH;
					}
				}

				const page = pdfDoc.addPage([pageWidth, pageHeight]);

				let drawW: number;
				let drawH: number;

				if (pageSizeChoice === 'fit') {
					drawW = pageWidth;
					drawH = pageHeight;
				} else {
					const margin = 10 * MM_TO_PT;
					const availW = pageWidth - margin * 2;
					const availH = pageHeight - margin * 2;
					const imgRatio = imgData.width / imgData.height;
					const availRatio = availW / availH;

					if (imgRatio > availRatio) {
						drawW = availW;
						drawH = availW / imgRatio;
					} else {
						drawH = availH;
						drawW = availH * imgRatio;
					}
				}

				const x = (pageWidth - drawW) / 2;
				const y = (pageHeight - drawH) / 2;

				page.drawImage(embeddedImage, { x, y, width: drawW, height: drawH });
			}

			pdfDoc.setTitle(title);
			if (author) pdfDoc.setAuthor(author);
			if (subject) pdfDoc.setSubject(subject);
			if (keywords.length) pdfDoc.setKeywords(keywords);

			pdfDoc.setCreator(author);
			pdfDoc.setCreationDate(new Date());

			const pdfBytes = await pdfDoc.save();
			const pdfBuffer = new Uint8Array(pdfBytes.length);
			pdfBuffer.set(pdfBytes);
			const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = outputName;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			URL.revokeObjectURL(url);

			status = `✅ 已產生並下載「${outputName}」（標題：${title}，作者：${author || '（未設定）'}）`;
			statusType = 'success';
		} catch (error) {
			console.error(error);
			status = '❌ 發生錯誤：' + (error instanceof Error ? error.message : 'Unknown error');
			statusType = 'error';
		}
	}
</script>

<div class="container">
	<h1 class="text-3xl font-bold mb-6">圖片轉 PDF</h1>
	<div class="subtitle mb-9">
		<p>
			全部在瀏覽器本機處理，圖片不會上傳到任何伺服器。
		</p>
	</div>

	<Panel title="1. 上傳圖片">
		<div
			class:dragover={isDragOver}
			class="px-36 py-16 bg-white/20 text-center"
			role="group" aria-label="drop zone"
			onclick={() => fileInputEl?.click()}
			ondragover={handleDragZoneOnDragOver}
			ondragleave={handleDragZoneOnDragLeave}
			ondrop={handleDragZoneOnDrop}
		>
			<div>拖放圖片到這裡，或點擊選擇檔案</div>
			<div class="mt-2 text-sm">
				支援 JPG / PNG / WebP / GIF / BMP，可一次選多張，會自動依檔案名稱排序（WebP 會以 PNG
				格式處理以保留透明度）
			</div>
			<input
				class="hidden"
				bind:this={fileInputEl}
				type="file"
				accept="image/*"
				multiple
				onchange={handleDragZoneInputOnChange}
			/>
		</div>

		{#if images.length > 0}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-4">
				{#each images as image, index (image.file.name + image.file.lastModified + index)}
					<div
						class="relative aspect-square cursor-grab overflow-hidden bg-white"
						draggable="true"
						ondragstart={(event) => handleThumbOnDragStart(event, index)}
						ondragend={handleThumbOnDragEnd}
						ondragover={handleThumbOnDragOver}
						ondrop={(event) => handleThumbOnDrop(event, index)}
					>
						<span class="absolute left-1 top-1 bg-black/30 px-1.5 py-0.5 text-[0.6rem]">{index + 1}</span>
						<img class="block h-full w-full object-cover" src={image.url} alt={image.file.name} />
						<span
							class="absolute inset-x-0 bottom-0 overflow-hidden bg-black/30 px-1.5 py-0.75 text-[0.6rem] text-ellipsis whitespace-nowrap"
							title={image.file.name}>{image.file.name}</span
						>
						<button
							type="button"
							class="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center border-none bg-red-500 text-xs leading-none hover:bg-rose-600"
							onclick={() => handleThumbDeleteButtonOnClick(index)}
						>
							✕
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="mt-4 text-sm text-rose-600">尚未加入任何圖片</div>
		{/if}
	</Panel>

	<Panel title="2. PDF 中繼資料設定">
		<div class="form-row">
			<FormGroup label="標題 (Title)" for="pdfTitle">
				<input id="pdfTitle" type="text" bind:value={pdfTitle} placeholder="例如：出差收據合輯" />
			</FormGroup>
			<FormGroup label="作者 (Author)" for="pdfAuthor">
				<input id="pdfAuthor" type="text" bind:value={pdfAuthor} placeholder="例如：你的名字" />
			</FormGroup>
		</div>

		<div class="form-row">
			<FormGroup label="主旨 (Subject) — 選填" for="pdfSubject">
				<input
					id="pdfSubject"
					type="text"
					bind:value={pdfSubject}
					placeholder="例如：2026 年 8 月出差單據"
				/>
			</FormGroup>
			<FormGroup label="關鍵字 (Keywords) — 選填，以逗號分隔" for="pdfKeywords">
				<input
					id="pdfKeywords"
					type="text"
					bind:value={pdfKeywords}
					placeholder="例如：收據, 出差, 報銷"
				/>
			</FormGroup>
		</div>

		<div class="form-row">
			<FormGroup label="頁面尺寸" for="pageSize">
				<select id="pageSize" bind:value={pageSize}>
					<option value="a4">A4</option>
					<option value="letter">Letter</option>
					<option value="fit">貼合圖片原尺寸</option>
				</select>
			</FormGroup>
			<FormGroup label="下載檔案名稱" for="fileName">
				<input id="fileName" type="text" bind:value={fileName} placeholder="output.pdf" />
			</FormGroup>
		</div>
	</Panel>

	<Panel title="3. 產生 PDF">
		<div class="flex flex-wrap items-center gap-3">
			<PrimaryButton disabled={images.length === 0} onclick={generatePdf}>
				產生並下載 PDF
			</PrimaryButton>
			<SecondaryButton onclick={resortImages}>
				依檔名重新排序
			</SecondaryButton>
			<SecondaryButton onclick={clearAll}>
				清空全部
			</SecondaryButton>
		</div>

		{#if status}
			<div class={`status ${statusType}`}>{status}</div>
		{/if}
	</Panel>
</div>

<style>
    @reference 'tailwindcss';

	.dragover {
		background-color: var(--color-primary-hover);
	}

	.form-row {
		@apply flex flex-wrap gap-4 mb-3;
	}

	.status {
		@apply mt-3 text-sm text-neutral-700;
	}

	.status.error {
		@apply text-rose-600;
	}

	.status.success {
		@apply text-emerald-600;
	}
</style>
